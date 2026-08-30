import { site } from '../data/site';

export function Nav() {
	return (
		<header className="site-nav">
			<a href="/" className="brand">
				{site.name}
			</a>
			<nav aria-label="Main navigation">
				{site.nav.map(item => (
					<a key={item.href} href={item.href}>
						{item.label}
					</a>
				))}
			</nav>
		</header>
	);
}
