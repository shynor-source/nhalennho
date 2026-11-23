package auth

// WeakAdminPassword reports whether the password is one of the sample values
// committed to the public repo or a trivially guessable credential. Returns
// the matched sample for logging/rejection messages (safe to echo: it is
// public knowledge by definition). Used both when seeding the first admin
// account and when changing passwords, so a public deployment can never run
// with a credential an attacker can read from the repository (brief 8.1).
func WeakAdminPassword(p string) (string, bool) {
	samples := []string{
		"change-this-admin-password", // .env.example sample
		"nhallennho123",              // historic dev password referenced in old notes
		"admin", "admin123", "admin@123", "password", "password1",
		"12345678", "123456789", "qwerty123", "letmein1",
	}
	for _, s := range samples {
		if p == s {
			return s, true
		}
	}
	return "", false
}
