
import * as fs from 'fs';
import * as process from 'process';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import * as readline from 'readline';


const RE_commit = /^([0-9a-z]{30,})\s(.*)$/;
const RE_fileEntry = /^(\d+|-)\s+(\d+|-)\s+(.*)$/;
const RE_issue = /(:?\[?([A-Za-z]{3,}[- ]*(:?\d+|X{3,}))\]?:?|\[[-a-zA-Z]+\])/;


interface IFileEntry {
  name: string;
  changes: number;
  messages: Set<string>;
  commits: Set<string>;
  issues: Set<string>;
}
interface IFileEntries {
  [key:string]: IFileEntry;
}

interface IIssueEntry {
  issue: string;
  files: Set<string>;
  commits: Set<string>;
  messages: Set<string>;
}

interface IResult {
  files: {
    [name:string]: IFileEntry;
  },
  issues: {
    [id:string]: IIssueEntry;
  },

  others: string[];
}

function collect(input: Readable, issueRE:RegExp = RE_issue, ignoreFiles?:RegExp) {
  let reader = readline.createInterface({ input });
  let message = '';
  let commit = '';
  let issue = null;
  let files: IFileEntries = {};
  let issues: { [issue:string]: IIssueEntry } = {};
  let others: string[] = [];

  reader.on('line', (line) => {
    let m: RegExpExecArray;
    if (null != (m = RE_commit.exec(line))) {
      commit = m[1];
      message = m[2];
      let mi = issueRE.exec(message);
      issue = !mi ? null : (mi[2] || mi[1]);

      if (!issue) {
        others.push(line);
      }

    } else if (null != (m = RE_fileEntry.exec(line))) {
      let name = m[3];
      if (!ignoreFiles || !ignoreFiles.test(name)) {
        if (null == files[name]) {
          files[name] = {
            name,
            changes: (m[1] !== '-') ? (+m[1] + +m[2]) : 0,
            messages: new Set(),
            commits: new Set(),
            issues: new Set()
          }
        }
        files[name].commits.add(commit);
        files[name].messages.add(message);
        files[name].changes += (m[1] !== '-') ? (+m[1] + +m[2]) : 0

        if (null != issue) {
          if (null == issues[issue]) {
            issues[issue] = {
              issue,
              files: new Set(),
              commits: new Set(),
              messages: new Set()
            }
          }
          issues[issue].files.add(name);
          issues[issue].commits.add(commit);
          issues[issue].messages.add(message);
          files[name].issues.add(issue);
        }

      }
    } else {
      console.log (`did not grok "${line}"`);
    }
  });
  input.on('end', () => {    
    let result: IResult = {
      files: sortedHash(files, (a,b)=>b.issues.size - a.issues.size), 
      issues: sortedHash(issues, (a,b)=>b.files.size-a.files.size),
      others
    };
    console.log(JSON.stringify(result, collectionsAsArrays, 2));
  });
}

function collectionsAsArrays(k: string, x: any):any {
  let xs: Set<string> = x;
  if (null != xs && typeof xs.values === 'function') {
    return [...xs];
  }
  return x;
}

function sortedHash<E>(h: { [k:string]: E }, compare: (a:E,b:E) => number) {
  let keys = Object.keys(h);
  keys.sort((a,b) => compare(h[a], h[b]));

  let result = {} as {[k:string]: E};

  keys.forEach(k => result[k] = h[k]);

  return result;
}

export function main(av: string[]) {
  let argv = av;
  //let git = spawn('git', [ '--numstat', '--pretty=oneline' ]);

  let ignoreFiles = undefined;
  let issuePattern = undefined;
  let lastSize = argv.length+1;
  while (argv.length && argv[0].startsWith('-') && lastSize != argv.length) {
    lastSize = argv.length;
    switch (argv[0]) {
      case '--ignore-images': 
        ignoreFiles = /\.(jpg|jpeg|png|gif)($|\/)/;
        argv = argv.slice(1);
        break;
      case '--ignore-files':
        ignoreFiles = new RegExp(argv[1]);
        argv = argv.slice(2);
        break;
      case '--issue-pattern': 
        issuePattern = new RegExp(argv[1]);
        argv = argv.slice(2);
        break;
      case '--help': 
        break;
      default:
        console.log(`unknown option: ${argv[0]}`);
        break;
    }
  }

  if (argv.length === 0) {
    collect(process.stdin as any, issuePattern, ignoreFiles); 
  } else {
    console.log(`usage: (git log --numstat --pretty=oneline)|${process.argv[1]} [--ignore-images|--ignore-files re] [--issue-pattern re]`);
  }
}


