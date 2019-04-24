import path from 'path';
import fs from 'fs-extra';

import { configNames } from '../utils/config-types';
import {
  configDir,
  loadOptions,
  resolveConfig,
  saveCustomConfig,
} from '../utils/options';
import { exitFailure, exitSuccess } from '../utils/process-utils';
import choosePackage from '../prompts/choose-package';
import { parseFileType } from '../utils/parse-functions';
import readConfigFile from '../utils/read-config-file';
import { createJsFile } from '../utils/util-functions';

export interface SaveOptions {
  name: string;
  force: boolean;
}

const checkExistance = (key: string, object: object): boolean =>
  Object.keys(object).includes(key);

const nameConficts = (configName: string): boolean =>
  configNames.includes(configName);

const alreadyExists = (configName: string): boolean =>
  checkExistance(configName, loadOptions().customConfigs);

export default async function save(
  configFile: string,
  options: SaveOptions,
): Promise<void> {
  const pathInfo = path.parse(configFile);
  const configName = options.name || pathInfo.name;

  // Make sure the name doesn't conflict with one of the defaults
  if (nameConficts(configName)) {
    exitFailure(
      `Error: ${configName} conflicts with built in config with the same name. Please provide a different name using the '--name' option.`,
    );
  }

  if (alreadyExists(configName) && !options.force) {
    exitFailure(
      `${configName} already exists! If you wish to replace it use the '--force' option.`,
    );
  }

  const configType = await choosePackage();

  // Check if __other__
  if (!configType) {
    return exitFailure('Custom package configs are currently not supported.');
  }

  const fileType = parseFileType(pathInfo.ext, configType);

  if (!fileType) {
    return exitFailure(
      `Error: ${pathInfo.ext} file type is not supported by ${configType.name}`,
    );
  }

  // Save the config info and copy the file
  saveCustomConfig(configName, configType);

  try {
    copyConfigFile(configFile, configName);
    exitSuccess(`Successfully saved ${configName}.`);
  } catch (error) {
    exitFailure(`An error occured will saving ${configName}:\n` + error);
  }
}

function copyConfigFile(filePath: string, configName: string) {
  const destPath = resolveConfig(`${configName}.js`);

  fs.ensureDirSync(configDir);

  // Save it as a js file to make it easily to read and utilize later
  if (path.extname(filePath) === 'js') {
    fs.copyFileSync(filePath, destPath);
  } else {
    const config = readConfigFile(filePath);
    const configFile = createJsFile(config);
    fs.writeFileSync(destPath, configFile, 'utf8');
  }
}