import { execSync, StdioOptions } from 'child_process';
import { resolveFixture } from './utils';
// @ts-expect-error no typings
import replaceall from 'replaceall';
import path from 'path';

const qnmBin = require.resolve('../../bin/qnm');

const runCommand = (
  command: string,
  {
    cwd,
    env,
    stdio,
  }: { cwd: string; env?: Record<string, any>; stdio?: StdioOptions }
) =>
  execSync(`node "${qnmBin}" ${command}`, {
    cwd,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      ...env,
      NODE_ENV: 'test',
    },
    stdio,
    encoding: 'utf-8',
  });

describe('CLI', () => {
  describe('qnm <module>]', () => {
    it('should show the version and dependents info on a single module when called with a string', () => {
      const cwd = resolveFixture('single-module');
      const output = runCommand('test', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should not show remote info when used with --no-remote', () => {
      const cwd = resolveFixture('single-module');
      const output = runCommand('test --no-remote', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should show get matches when using the match command', () => {
      const cwd = resolveFixture('single-module');
      const output = runCommand('match te', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should add dependents information on yarn installed package', () => {
      const cwd = resolveFixture('yarn-install');
      const output = runCommand('import-from', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should add dependents information on yarn 3 installed package', () => {
      const cwd = resolveFixture('yarn-3');
      const output = runCommand('resolve-from', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should show an indication in case there is a symlink', () => {
      const isWindows = /^win/.test(process.platform);

      if (isWindows) {
        const cwd = resolveFixture('symlink');
        // symlinks in windows are a bit different
        const output = runCommand('test-windows', { cwd });

        // the snapshot must look similar to the one on windows
        expect(
          replaceall('\\', '/', replaceall('-windows', '', output))
        ).toMatchSnapshot();
        return;
      }

      const cwd = resolveFixture('symlink');
      const output = runCommand('test', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should work in monorepo', () => {
      const cwd = resolveFixture('monorepo');
      const output = runCommand('test', { cwd });

      expect(replaceall('\\', '/', output)).toMatchSnapshot();
    });

    it('should work in monorepo with yarn workspaces', () => {
      const cwd = resolveFixture('monorepo-with-workspaces');
      const output = runCommand('package-foo', { cwd });

      expect(replaceall('\\', '/', output)).toMatchSnapshot();
    });

    it('should provide suggestion for scoped package with the same name', () => {
      const cwd = resolveFixture('scoped-package');
      expect.assertions(1);

      try {
        runCommand('test', { cwd, stdio: 'pipe' });
      } catch (error: any) {
        expect(error.message).toMatch('Did you mean "@scope/test"');
      }
    });

    it('should mark bundledDependencies', () => {
      const cwd = resolveFixture('bundled-dependencies');
      const output = runCommand('test', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should mark resolutions', () => {
      const cwd = resolveFixture('resolutions');
      const output = runCommand('test', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should mark bundleDependencies', () => {
      const cwd = resolveFixture('bundle-dependencies');
      const output = runCommand('test', { cwd });

      expect(output).toMatchSnapshot();
    });
  });

  describe('qnm list', () => {
    it('should show all modules in node_modules directory', () => {
      const cwd = resolveFixture('mix-modules');
      const output = runCommand('list', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should show modules mentioned in package.json', () => {
      const cwd = resolveFixture('indirect-dependencies');
      const output = runCommand('list --deps', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should --disable-colors', () => {
      const cwd = resolveFixture('indirect-dependencies');
      const output = runCommand('list --disable-colors', {
        cwd,
        env: {
          FORCE_COLOR: '1',
        },
      });

      expect(output).toMatchSnapshot();
    });

    it('should list dependencies in a yarn installed package and show "why" information', () => {
      const cwd = resolveFixture('yarn-install');
      const output = runCommand('list', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should support an empty package in a monorepo', () => {
      const cwd = resolveFixture(
        path.join('monorepo', 'packages', 'package-without-modules')
      );
      const output = runCommand('camelcase', { cwd });

      expect(output).toMatchSnapshot();
    });

    it('should throw correctly when module is not found in a monorepo', () => {
      const cwd = resolveFixture(
        path.join('monorepo', 'packages', 'package-without-modules')
      );

      try {
        runCommand('does-not-exists', { cwd, stdio: 'pipe' });
      } catch (error: any) {
        expect(error.message).toMatch(
          'Could not find any module by the name: "does-not-exists"'
        );
      }
    });
  });
});
