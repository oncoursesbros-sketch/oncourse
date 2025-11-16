export const validateRegister = (req, res, next) => {
  const { phone, email, login, password } = req.body;

  if (!phone || !email || !login || !password) {
    return res.status(400).json({ 
      message: 'Все поля обязательны для заполнения' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      message: 'Пароль должен содержать минимум 6 символов' 
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ 
      message: 'Некорректный email' 
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ 
      message: 'Логин и пароль обязательны' 
    });
  }

  next();
};