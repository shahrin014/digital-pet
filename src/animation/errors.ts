export class AnimationPackError extends Error {
  readonly issues: string[];

  constructor(issues: string[] | string) {
    const list = Array.isArray(issues) ? issues : [issues];
    super(list.join(' '));
    this.name = 'AnimationPackError';
    this.issues = list;
  }
}
