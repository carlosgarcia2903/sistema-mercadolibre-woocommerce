<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationCodeTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'registration_code' => 'codigo-secreto',
            'name' => 'Nueva Persona',
            'email' => 'nueva@example.com',
            'password' => 'password-segura-123',
            'password_confirmation' => 'password-segura-123',
        ], $overrides);
    }

    public function test_registration_is_closed_when_no_code_is_configured(): void
    {
        config(['auth.registration_code' => null]);

        $this->get('/register')->assertNotFound();
        $this->post('/register', $this->payload())->assertNotFound();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_rejects_a_wrong_code(): void
    {
        config(['auth.registration_code' => 'codigo-secreto']);

        $this->post('/register', $this->payload(['registration_code' => 'incorrecto']))
            ->assertSessionHasErrors('registration_code');

        $this->assertDatabaseCount('users', 0);
        $this->assertGuest();
    }

    public function test_registration_requires_the_code_field(): void
    {
        config(['auth.registration_code' => 'codigo-secreto']);

        $this->post('/register', $this->payload(['registration_code' => '']))
            ->assertSessionHasErrors('registration_code');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_works_with_the_right_code(): void
    {
        config(['auth.registration_code' => 'codigo-secreto']);

        $this->get('/register')->assertOk();
        $this->post('/register', $this->payload())->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();
        $this->assertSame(1, User::count());
    }
}
