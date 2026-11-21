const neededMajorVersion = 24

export function nodeVersionProblem(version: string): string | undefined {
  const major = Number(version.split('.')[0])
  return major >= neededMajorVersion
    ? undefined
    : `scratch-pad needs Node ${neededMajorVersion}, but this is Node ${version}. Run the command again with Node ${neededMajorVersion}.`
}
