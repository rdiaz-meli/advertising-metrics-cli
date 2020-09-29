/* eslint-disable import/prefer-default-export */

export function parseProject(project: string) {
  let [owner, repo] = project.split('/');

  if (!owner) {
    owner = 'mercadolibre';
  }

  if (!repo) {
    repo = owner;
    owner = 'mercadolibre';
  }

  return { owner, repo };
}
