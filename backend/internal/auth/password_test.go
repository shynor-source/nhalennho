package auth

import "testing"

func TestHashPasswordRoundTrip(t *testing.T) {
	hash, err := HashPassword("mat-khau-123")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	ok, err := VerifyPassword(hash, "mat-khau-123")
	if err != nil || !ok {
		t.Errorf("VerifyPassword(correct) = %v, %v; want true", ok, err)
	}
	ok, err = VerifyPassword(hash, "sai-mat-khau")
	if err != nil {
		t.Fatalf("VerifyPassword error: %v", err)
	}
	if ok {
		t.Error("VerifyPassword(wrong password) = true; want false")
	}
}

func TestVerifyPasswordMalformed(t *testing.T) {
	for _, bad := range []string{
		"",
		"not-a-hash",
		"$argon2id$v=19$m=1,t=1,p=1$",
		"$bcrypt$v=19$m=1,t=1,p=1$abc$def",
	} {
		if ok, err := VerifyPassword(bad, "x"); ok || err == nil {
			t.Errorf("VerifyPassword(%q) = %v, %v; want error", bad, ok, err)
		}
	}
}

func TestNewTokenUnique(t *testing.T) {
	a, hashA, err := NewToken()
	if err != nil {
		t.Fatalf("NewToken: %v", err)
	}
	b, hashB, err := NewToken()
	if err != nil {
		t.Fatalf("NewToken: %v", err)
	}
	if a == b || hashA == hashB {
		t.Error("tokens must be unique")
	}
	if HashToken(a) != hashA {
		t.Error("HashToken mismatch")
	}
}
