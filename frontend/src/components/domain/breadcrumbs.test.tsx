import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { Breadcrumbs } from '@/components/domain/breadcrumbs';

describe('Breadcrumbs', () => {
  test('renderiza crumb atual', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <Breadcrumbs />,
          handle: { crumb: 'Dashboard' },
        },
      ],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
