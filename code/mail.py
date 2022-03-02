import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

smtp_server = "smtp"
port = os.environ["SMTP_PORT"]
sender = f"no-reply@{os.environ['DOMAIN']}"

def sendMail(reciever, subject, template, templateContent):
    message = MIMEMultipart("alternative")
    message["Subject"]=subject
    message["From"]=sender
    message["To"]=reciever
    message.attach(MIMEText(template.txtContent.format(**templateContent), "plain", "UTF-8"))
    message.attach(MIMEText(template.htmlContent.format(**templateContent, **{"style":EMAIL_STYLE}), "html", "UTF-8"))

    with smtplib.SMTP(smtp_server, port) as server:
        server.sendmail(sender, reciever, message.as_string())
    return

class EMailTemplate:
    template_prefix = "/code/email_templates/"

    def __init__(self, name):

        with open(f"{self.template_prefix}{name}.html", "r") as f:
            self.htmlContent = f.read()

        with open(f"{self.template_prefix}{name}.txt", "r") as f:
            self.txtContent = f.read()


EMAIL_TEMPLATES = {
    "signupconfirmation": EMailTemplate("signupconfirmation"),
    "gamefinished": EMailTemplate("gamefinished"),
    "joinedcompetition": EMailTemplate("joinedcompetition"),
}

with open("/code/static/styles/_email_style.css", "r") as f:
    EMAIL_STYLE = f"<style>{css}</style>".format({"css":f.read()})