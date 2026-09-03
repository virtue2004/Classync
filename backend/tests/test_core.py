import unittest

from app.connection_code import decode_connection_code, encode_connection_code
from app.file_validation import validate_upload


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


if __name__ == "__main__":
    unittest.main()
