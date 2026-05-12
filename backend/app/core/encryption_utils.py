import os
from cryptography.fernet import Fernet

class EncryptionManager:
    def __init__(self, key: str, enabled: bool = True):
        self.enabled = enabled
        self.cipher_suite = None
        if self.enabled:
            self.load_key(key)

    def load_key(self, key: str):
        # Key is expected to be a base64-encoded string
        from cryptography.fernet import Fernet
        self.cipher_suite = Fernet(key.encode() if isinstance(key, str) else key)

    def encrypt_file(self, file_path: str):
        if not self.enabled or not self.cipher_suite:
            return
        with open(file_path, 'rb') as f:
            file_data = f.read()
        encrypted_data = self.cipher_suite.encrypt(file_data)
        with open(file_path, 'wb') as f:
            f.write(encrypted_data)

    def decrypt_file(self, file_path: str) -> bytes:
        if not self.enabled or not self.cipher_suite:
            with open(file_path, 'rb') as f:
                return f.read()
        with open(file_path, 'rb') as f:
            encrypted_data = f.read()
        decrypted_data = self.cipher_suite.decrypt(encrypted_data)
        return decrypted_data

    def encrypt_bytes(self, data: bytes) -> bytes:
        if not self.enabled or not self.cipher_suite:
            return data
        return self.cipher_suite.encrypt(data)

    def decrypt_bytes(self, data: bytes) -> bytes:
        if not self.enabled or not self.cipher_suite:
            return data
        return self.cipher_suite.decrypt(data) 