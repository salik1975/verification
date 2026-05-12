import os
import base64

# Generate a 256-bit (32-byte) key for AES-256
aes_key = os.urandom(32)

# It's often more convenient to store binary keys in a text-safe format like Base64
encoded_key = base64.b64encode(aes_key)

# Save the key to a file
with open('aes_key.txt', 'wb') as f:
    f.write(encoded_key)

print("Successfully generated and saved 'aes_key.txt'.")
print("\nThis file contains a 256-bit key, encoded in Base64, suitable for AES-256 encryption.")