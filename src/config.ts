import fs from "fs";
import os from "os";
import path from "path";
export type Config = {
  dbUrl: string;
  currentUserName?: string;
};
export function setUser(userName: string): void {
  const config = readConfig();

  config.currentUserName = userName;

  const path = os.homedir() + "/.gatorconfig.json";

  fs.writeFileSync(path, JSON.stringify({
    db_url: config.dbUrl,
    current_user_name: config.currentUserName
  }));
}
export function readConfig(): Config {
  const path = os.homedir() + "/.gatorconfig.json";
  const data = fs.readFileSync(path, "utf-8");
  const json = JSON.parse(data);

  return {
    dbUrl: json.db_url,
    currentUserName: json.current_user_name
  };
}