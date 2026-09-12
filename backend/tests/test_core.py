import unittest
from unittest.mock import patch
import tempfile
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.connection_code import decode_connection_code, encode_connection_code
from app.file_validation import validate_upload
from app.routers.devices import _check_setup_key, recover_owner
from app.routers.shares import list_my_shares
from app.file_scanner import scan_file
from app.models import Base, Device, Share
from app.schemas import OwnerClaimRequest


class ConnectionCodeTests(unittest.TestCase):
    def test_round_trip(self):
        self.assertEqual(decode_connection_code(encode_connection_code("192.168.40.12", 8000)), ("192.168.40.12", 8000))


class UploadValidationTests(unittest.TestCase):
    def test_rejects_executables(self):
        with self.assertRaises(Exception):
            validate_upload("malware.exe", b"MZ", 2)

    def test_rejects_unknown_extension(self):
        with self.assertRaises(Exception):
            validate_upload("payload.html", b"<html>", 6)


class OwnerSetupKeyTests(unittest.TestCase):
    def test_accepts_whitespace_from_copied_key(self):
        with patch("app.routers.devices.settings.OWNER_SETUP_KEY", "secret-key"):
            _check_setup_key("  secret-key\r\n")

    def test_rejects_incorrect_key(self):
        with patch("app.routers.devices.settings.OWNER_SETUP_KEY", "secret-key"):
            with self.assertRaises(HTTPException):
                _check_setup_key("different-key")


class FileScannerTests(unittest.TestCase):
    def test_flags_corrupted_office_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "broken.docx"
            path.write_bytes(b"not a zip archive")
            result = scan_file(path, "broken.docx")
            self.assertEqual(result.status, "suspicious")
            self.assertEqual(len(result.sha256), 64)


class LinkedOwnerTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def test_linking_phone_keeps_existing_owner_and_shares_workspace(self):
        laptop = Device(device_id="laptop", device_token="a", label="Laptop", is_owner=True, can_share=True)
        phone = Device(device_id="phone", device_token="b", label="Phone")
        tutor = Device(device_id="tutor", device_token="c", label="Tutor", can_share=True)
        self.db.add_all([laptop, phone, tutor])
        self.db.flush()
        self.db.add_all([
            Share(code="OWNERFILE1", label="Laptop file", created_by_id=laptop.id),
            Share(code="TUTORFILE1", label="Tutor file", created_by_id=tutor.id),
        ])
        self.db.commit()

        with patch("app.routers.devices.settings.OWNER_SETUP_KEY", "secret-key"):
            recover_owner(OwnerClaimRequest(setup_key="secret-key"), phone, self.db)

        self.assertTrue(laptop.is_owner)
        self.assertTrue(phone.is_owner)
        labels = {share.label for share in list_my_shares(self.db, phone)}
        self.assertEqual(labels, {"Laptop file"})


if __name__ == "__main__":
    unittest.main()
