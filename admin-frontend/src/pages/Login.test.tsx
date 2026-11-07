import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';

const signIn = vi.fn();
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ me: null, loading: false, signIn }) }));

describe('Login page', () => {
  it('shows the server message when sign-in fails', async () => {
    const { ApiError } = await import('@/lib/api-client');
    signIn.mockRejectedValueOnce(new ApiError('Wrong email or password', 401));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Wrong email or password'));
    expect(signIn).toHaveBeenCalledWith('owner@example.com', 'nope');
  });
});
