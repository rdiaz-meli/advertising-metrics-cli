import ApiClient from './api';

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

export function parseRelease(release: string, token: string) {
  if (!/.+@.+/.test(release)) {
    console.log(
      `${release.bold} don't match with ${
        'project@version'.bold
      }. Example: ${'fury_advertising-pads-frontend@1.0.0'}`.red,
    );
    process.exit();
  }

  const [project, version] = release.split('@');
  const { owner, repo } = parseProject(project);
  const apiClient = new ApiClient(owner, repo, token);

  return {
    owner,
    repo,
    version,
    apiClient,
  };
}

export function parseReleases(releases: string[], token: string) {
  return releases.map((release) => parseRelease(release, token));
}
