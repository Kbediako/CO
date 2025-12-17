package greet

import "testing"

func TestHello(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		want string
	}{
		{name: "Codex", want: "Hello, Codex!"},
		{name: "", want: "Hello, world!"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := Hello(tc.name); got != tc.want {
				t.Fatalf("Hello(%q)=%q; want %q", tc.name, got, tc.want)
			}
		})
	}
}

