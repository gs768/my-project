// Command line: `run` all projects now, or seed a `demo` project with 30 days of simulated history.
import { all, getDb } from './db.js';
import { runProject } from './runner.js';
import { createProject, getProject } from './projects.js';
import { MOCK_ENGINES } from './providers/mock.js';

const [cmd, arg] = process.argv.slice(2);
getDb();

if (cmd === 'run') {
  const ids = arg ? [Number(arg)] : all('SELECT id FROM projects').map((p) => p.id);
  for (const id of ids) {
    console.log(`Running project ${id}…`);
    const runId = await runProject(id, { trigger: 'cli' });
    console.log(`  done (run ${runId})`);
  }
} else if (cmd === 'demo') {
  const days = Number(arg) || 30;
  const id = createProject({
    name: 'Demo — Project management software',
    providers: MOCK_ENGINES.map((m) => m.id),
    brand: { name: 'Taskflow', domain: 'taskflow.io', aliases: ['TaskFlow'] },
    competitors: [
      { name: 'Asana', domain: 'asana.com' },
      { name: 'Monday.com', domain: 'monday.com', aliases: ['monday'] },
      { name: 'ClickUp', domain: 'clickup.com' },
      { name: 'Trello', domain: 'trello.com' },
      { name: 'Notion', domain: 'notion.so' },
    ],
    prompts: [
      { text: 'What is the best project management software for small teams?', tags: ['category'] },
      { text: 'Best alternatives to Asana', tags: ['comparison'] },
      { text: 'Which task management tool has the best free plan?', tags: ['pricing'] },
      { text: 'Project management tools for marketing agencies', tags: ['use-case'] },
      { text: 'ClickUp vs Monday vs Taskflow — which should I choose?', tags: ['comparison'] },
      { text: 'Easiest kanban board app for remote teams', tags: ['use-case'] },
      { text: 'Top rated project management apps 2026', tags: ['category'] },
      { text: 'Affordable project management software for startups', tags: ['pricing'] },
    ],
  });
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    await runProject(id, { trigger: 'demo', day });
    process.stdout.write('.');
  }
  const p = getProject(id);
  console.log(`\nCreated demo project #${id} "${p.name}" with ${p.prompts.length} prompts × ${p.providers.length} engines × ${days} days.`);
} else {
  console.log('Usage: node src/cli.js run [projectId] | demo [days]');
  process.exit(1);
}
