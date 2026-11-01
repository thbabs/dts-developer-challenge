export function Header() {
  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <div className="brand">
          <span className="brand__org">HMCTS</span>
          <span className="brand__product">Caseworker tasks</span>
        </div>
        <p className="site-header__date">
          <span className="visually-hidden">Today is </span>
          {today}
        </p>
      </div>
    </header>
  );
}
