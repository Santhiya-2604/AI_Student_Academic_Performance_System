from database.database import authenticate_user


def login_user(username, password):
    if not username or not password:
        return {
            "success": False,
            "message": "Username and password are required."
        }

    user = authenticate_user(username, password)

    if user:
        return {
            "success": True,
            "message": "Login successful.",
            "user": user
        }

    return {
        "success": False,
        "message": "Invalid username or password."
    }