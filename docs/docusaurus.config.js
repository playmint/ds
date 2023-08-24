// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Downstream',
  tagline: 'How to play and create',
  favicon: '/images/favicon.png',

  // Set the production url of your site here
  url: 'https://docs.downstream.game',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  //organizationName: 'facebook', // Usually your GitHub org/user name.
  //projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/playmint/ds/tree/main/docs',

          path: './content'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        }
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: '/images/social-card.png',
      navbar: {
        title: 'Downstream',
        logo: {
          alt: 'Downstram Logo',
          src: '/images/logo.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://testnet.downstream.game',
            label: 'Play Downstream',
            position: 'left',
          },
          {
            href: 'https://github.com/playmint/ds/',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://playmint.com',
            label: 'Playmint',
            position: 'right',
          },
          {
            href: 'https://discord.gg/c9jR6HsPKh',
            label: 'Discord',
            position: 'right',
          },
          {
            href: 'https://https://twitter.com/DownstreamGamediscord.gg/c9jR6HsPKh',
            label: 'Twitter',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'How to play and create',
                to: '/docs/downstream',
              },
              {
                label: 'Playmint',
                href: 'https://playmint.com'
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/c9jR6HsPKh',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/DownstreamGame',
              },
            ],
          },
          {
            title: 'Play',
            items: [
              {
                label: 'Current Live Game',
                href: 'https://testnet.downstream.game',
              },
            ]
          },
          {
            title: 'Source',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/playmint/ds/',
              },
            ],
          },
        ],
        copyright: `Copyleft © ${new Date().getFullYear()} Playmint. Docs site built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
