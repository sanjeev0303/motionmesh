import { appName, gitConfig, socialLinks } from './shared';
import { Github, MessagesSquare, LifeBuoy } from 'lucide-react';
import type { LinkItemType } from 'fumadocs-ui/layouts/links';

function BrandLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-accent-motion to-accent-mesh flex items-center justify-center">
        <div className="w-3.5 h-3.5 bg-base rounded-sm" />
      </div>
      <span className="font-display font-bold tracking-tight">{appName}</span>
    </div>
  );
}

export function baseOptions() {
  return {
    nav: {
      // JSX supported
      title: <BrandLogo />,
    },
    sidebar: {
      banner: (
        <div className="mx-3 mt-3 rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> All systems operational
          </span>
          <br />
          Open-source video infrastructure.
        </div>
      ),
      footer: (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-text-muted">
          <span>v1 API · {appName}</span>
          <a
            href={socialLinks.discord}
            target="_blank"
            rel="noreferrer"
            className="hover:text-text-primary transition-colors"
            aria-label="Join the Discord"
          >
            <MessagesSquare className="w-4 h-4" />
          </a>
        </div>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        type: 'main',
        url: socialLinks.discord,
        icon: <MessagesSquare />,
        text: 'Discord',
        external: true,
      },
      {
        type: 'main',
        url: socialLinks.discussions,
        icon: <LifeBuoy />,
        text: 'Discussions',
        external: true,
      },
      {
        type: 'main',
        url: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
        icon: <Github />,
        text: 'GitHub',
        external: true,
      },
    ] satisfies LinkItemType[],
  };
}
