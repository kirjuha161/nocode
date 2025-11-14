// Добавляем placeholder к полям формы
document.addEventListener('DOMContentLoaded', function() {
    const usernameField = document.getElementById('id_username');
    const emailField = document.getElementById('id_email');
    const password1Field = document.getElementById('id_password1');
    const password2Field = document.getElementById('id_password2');
    
    if (usernameField) usernameField.placeholder = 'Придумайте имя пользователя';
    if (emailField) emailField.placeholder = 'Введите ваш email';
    if (password1Field) password1Field.placeholder = 'Придумайте пароль';
    if (password2Field) password2Field.placeholder = 'Повторите пароль';
});

