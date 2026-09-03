"""
Turns an IPv4 address + port into a short, typeable code and back again.

Why not just hand out a random code the server remembers? Because resolving
a random code back to an address would itself require a network request to
somewhere — defeating the "no internet, no lookup service" point of this
whole app. Instead the code IS the address, just compressed: 4 IP octets +
a 2-byte port = 6 bytes = 48 bits, encoded with Crockford's Base32 alphabet
(no ambiguous 0/O or 1/I/L characters, so it's easy to read aloud or copy
off a whiteboard).
"""

CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def encode_connection_code(ip: str, port: int) -> str:
    octets = [int(o) for o in ip.split(".")]
    if len(octets) != 4 or any(not (0 <= o <= 255) for o in octets):
        raise ValueError("Only IPv4 addresses are supported")
    if not (0 <= port <= 65535):
        raise ValueError("Port out of range")

    data = bytes(octets) + port.to_bytes(2, "big")  # 6 bytes = 48 bits
    bits = "".join(f"{b:08b}" for b in data)

    chars = []
    for i in range(0, len(bits), 5):
        chunk = bits[i:i + 5].ljust(5, "0")
        chars.append(CROCKFORD_ALPHABET[int(chunk, 2)])

    code = "".join(chars)  # 10 characters
    return "-".join(code[i:i + 4] for i in range(0, len(code), 4))  # e.g. XXXX-XXXX-XX


def decode_connection_code(code: str) -> tuple[str, int]:
    clean = code.replace("-", "").replace(" ", "").upper()
    # Forgive common misreads of similar-looking characters.
    clean = clean.replace("O", "0").replace("I", "1").replace("L", "1")

    bits = ""
    for ch in clean:
        if ch not in CROCKFORD_ALPHABET:
            raise ValueError(f"'{ch}' is not a valid character in a connection code")
        bits += f"{CROCKFORD_ALPHABET.index(ch):05b}"

    bits = bits[:48]
    data = bytes(int(bits[i:i + 8], 2) for i in range(0, 48, 8))
    ip = ".".join(str(b) for b in data[:4])
    port = int.from_bytes(data[4:6], "big")
    return ip, port
