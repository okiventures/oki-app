describe('App', () => {
  it('module can be imported', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../App');
    }).not.toThrow();
  });
});
