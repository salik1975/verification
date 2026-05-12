import smtplib
from email.message import EmailMessage

class GmailSender:
    def __init__(self, email_address, email_password):
        self.email_address = email_address
        self.email_password = email_password

    def send_email(self, to_address, subject, body):
        msg = EmailMessage()
        msg["From"] = self.email_address
        msg["To"] = to_address
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
            smtp.starttls()
            smtp.login(self.email_address, self.email_password)
            smtp.send_message(msg)