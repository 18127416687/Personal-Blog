from flask_login import UserMixin


class UserLogin(UserMixin):
    def __init__(self, user):
        self.id = user.id
        self.username = user.username
        self.is_admin = bool(getattr(user, "is_admin", False))
        self._is_active = bool(getattr(user, "is_active", True))

    @property
    def is_active(self):
        return self._is_active
