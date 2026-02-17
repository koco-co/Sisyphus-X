"""密码加密服务 - 使用 AES-256-GCM 加密数据库密码

参考文档: docs/接口定义.md §3.6 数据库配置管理
"""

import base64
import os

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings


def derive_key(password: str, salt: bytes) -> bytes:
    """从密码派生加密密钥

    Args:
        password: 主密码
        salt: 盐值

    Returns:
        32 字节的加密密钥
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend(),
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_password(plain_password: str) -> str:
    """加密数据库密码

    Args:
        plain_password: 明文密码

    Returns:
        Base64 编码的加密密文 (格式: salt:nonce:ciphertext)
    """
    # 生成随机盐和 nonce
    salt = os.urandom(16)
    nonce = os.urandom(12)

    # 从 SECRET_KEY 派生加密密钥
    key = derive_key(settings.SECRET_KEY, salt)

    # 使用 AES-256-GCM 加密
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(plain_password.encode("utf-8")) + encryptor.finalize()

    # 组合: salt + nonce + ciphertext + tag
    combined = salt + nonce + ciphertext + encryptor.tag

    # 返回 Base64 编码
    return base64.b64encode(combined).decode("utf-8")


def decrypt_password(encrypted_password: str) -> str:
    """解密数据库密码

    Args:
        encrypted_password: Base64 编码的加密密文

    Returns:
        明文密码
    """
    # Base64 解码
    combined = base64.b64decode(encrypted_password.encode("utf-8"))

    # 分离各部分
    salt = combined[:16]
    nonce = combined[16:28]
    tag = combined[-16:]
    ciphertext = combined[28:-16]

    # 从 SECRET_KEY 派生解密密钥
    key = derive_key(settings.SECRET_KEY, salt)

    # 使用 AES-256-GCM 解密
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag), backend=default_backend())
    decryptor = cipher.decryptor()
    plaintext = decryptor.update(ciphertext) + decryptor.finalize()

    return plaintext.decode("utf-8")
