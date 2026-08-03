// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

// https://astro.build/config
export default defineConfig({
	site: 'https://openspeak.website',
	integrations: [
		starlight({
			title: 'OpenSpeak',
			// The agenda app is served under /run on the same domain — it is not
			// part of this static site, so exclude it from link validation.
			plugins: [starlightLinksValidator({ exclude: ['/run'] })],
			description: 'Open-source software for running structured, timed meetings.',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/Elektryczna-Owca/OpenSpeak' },
			],
			editLink: {
				baseUrl: 'https://github.com/Elektryczna-Owca/OpenSpeak/edit/main/website/',
			},
			sidebar: [
				{
					label: 'Getting started',
					items: [
						{ label: 'What is OpenSpeak?', slug: 'getting-started/introduction' },
						{ label: 'Quick start', slug: 'getting-started/quick-start' },
						{ label: 'Install & self-host', slug: 'getting-started/self-hosting' },
					],
				},
				{
					label: 'Core concepts',
					items: [
						{ label: 'Agendas, items & time limits', slug: 'concepts/agendas-and-items' },
						{ label: 'Sub-item loops (speaker rounds)', slug: 'concepts/sub-item-loops' },
						{ label: 'Participants & roles', slug: 'concepts/participants' },
					],
				},
				{
					label: 'Planning a meeting',
					items: [
						{ label: 'The agenda editor', slug: 'planning/agenda-editor' },
						{ label: 'Importing from CSV', slug: 'planning/csv-import' },
						{ label: 'Templates', slug: 'planning/templates' },
					],
				},
				{
					label: 'Running a meeting',
					items: [
						{ label: 'How a live meeting works', slug: 'running/overview' },
						{ label: 'The display screen', slug: 'running/display-screen' },
						{ label: 'The control screen', slug: 'running/control-screen' },
						{ label: 'Reports', slug: 'running/reports' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'CSV format reference', slug: 'reference/csv-columns' },
						{ label: 'FAQ & troubleshooting', slug: 'reference/faq' },
					],
				},
			],
		}),
	],
});
