import { Link, useMatches } from 'react-router-dom';

type MatchHandle = { crumb?: string };

export const Breadcrumbs = () => {
  const matches = useMatches();
  const crumbs = matches
    .map((match) => ({ pathname: match.pathname, crumb: (match.handle as MatchHandle | undefined)?.crumb }))
    .filter((item): item is { pathname: string; crumb: string } => Boolean(item.crumb));

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {crumbs.map((crumb, index) => (
          <li key={crumb.pathname}>
            {index === crumbs.length - 1 ? (
              <span aria-current="page">{crumb.crumb}</span>
            ) : (
              <>
                <Link className="hover:underline" to={crumb.pathname}>
                  {crumb.crumb}
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
