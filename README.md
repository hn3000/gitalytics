
# git analytics

A tool to parse the output of `git log --numstat --pretty=oneline`
into  an easy-to-manipulate JSON structure.

You call the tool like this:

    git log --numstat --pretty=oneline| node gitalytics > git-stats.json


The TypeScript description of the created file would be:

    interface IResult {
        files: {
            [name:string]: {
                name: string;
                changes: number;
                messages: string[];
                commits: string[];
                issues: string[];
            };
        };
        issues: {
            [id:string]: {
                issue: string;
                files: Set<string>;
                commits: Set<string>;
                messages: Set<string>;
            };
        };
    }

To give an example, the JSON will look like this:

    {
        "files": {
            "<filename>": {
                "name": "<filename>",
                "changes": <count>,
                "messages": [ "<commit message>", ... ],
                "commits": [ "<commit hash>", ... ],
                "issues": [ "<issue number>", ... ]
            }
        },
        "issues": {
            "<issue number>": {
                "issue": "<issue number>",
                "files": [ "<filename>", ... ],
                "commits": [ "<commit hash>", ... ],
                "messages": [ "<commit message>", ... ]
            }
        }
    }

The files are sorted by number of changes, the issues are sorted by number of
changed files.

And it's easy to pull out other metrics:

    node -p "Object.values(require('./git-stats.json').files)
    .map(x => [x.name, Math.round(x.issues.length ? x.commits.length/x.issues.length : 0), x.issues, x.commits])
    .sort((a,b) => (-a[1] + b[1]))
    .slice(0, 30)"

This shows the top 30 files that had the most changes per issue.
