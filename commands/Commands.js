"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Commands = void 0;
const globmatcher_1 = require("../common/globmatcher");
const telemetry_1 = require("../common/telemetry");
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

/* eslint-enable */
class Commands {
    constructor(github, config, action) {
        this.github = github;
        this.config = config;
        this.action = action;
    }
    async matches(command, issue, changedFiles) {
        var _a, _b;
        if (command.requireLabel && !issue.labels.includes(command.requireLabel)) {
            return false;
        }
        if (command.disallowLabel && issue.labels.includes(command.disallowLabel)) {
            return false;
        }
        if ('label' in this.action) {
            return command.type === 'label' && this.action.label === command.name;
        }
        if ('comment' in this.action) {
            const userStr = await this.fileFetcher()
            console.log("Info action.username: \n", this.action.user.name);
            return (command.type === 'comment' &&
                !!this.action.comment.match(new RegExp(`(/|\\\\)${escapeRegExp(command.name)}(\\s|$)`, 'i')) &&
                ((await this.github.hasWriteAccess(this.action.user)) ||
                    command.allowUsers.includes(this.action.user.name) ||
                    command.allowUsers.includes('*') ||
                    userStr.toString().includes(this.action.user.name) ||
                    (this.action.user.name === issue.author.name && command.allowUsers.includes('@author'))));
        }
        if (command.type === 'changedfiles' && command.matches) {
            if (!command.name) {
                command.name = 'changedfiles';
            }
            let matchCfg = {
                all: undefined,
                any: undefined,
            };
            if (typeof command.matches === 'string') {
                matchCfg.any = [command.matches];
            }
            else if ('any' in command.matches) {
                matchCfg.any = command.matches.any;
            }
            else if ('all' in command.matches) {
                matchCfg.all = command.matches.all;
            }
            else {
                matchCfg.any = command.matches;
            }
            return globmatcher_1.checkMatch(changedFiles, matchCfg);
        }
        if (command.type === 'author' && 'memberOf' in command) {
            if (command.memberOf && 'org' in command.memberOf && ((_a = command.memberOf) === null || _a === void 0 ? void 0 : _a.org.length) > 0) {
                return await this.github.isUserMemberOfOrganization(command.memberOf.org, issue.author.name);
            }
        }
        if (command.type === 'author' && 'notMemberOf' in command) {
            if (command.notMemberOf && 'org' in command.notMemberOf && ((_b = command.notMemberOf) === null || _b === void 0 ? void 0 : _b.org.length) > 0) {
                return !(await this.github.isUserMemberOfOrganization(command.notMemberOf.org, issue.author.name));
            }
        }
        return false;
    }
    async perform(command, issue, changedFiles) {
        var _a, _b;
        if (!(await this.matches(command, issue, changedFiles)))
            return;

        console.log(`Running command ${command.name}:`);
        await telemetry_1.trackEvent(this.github, 'command', { name: command.name });
        const tasks = [];
        if ('comment' in this.action && (command.name === 'label' || command.name === 'assign')) {
            const args = [];
            let argList = ((_b = (_a = this.action.comment.match(new RegExp(String.raw `(?:\\|/)${command.name}(.*)(?:\r)?(?:\n|$)`))) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '').trim();
            console.log("Info comment: ", this.action.comment)
            console.log("Info argList：", argList.toString())
            const argListCopy = argList
            while (argList) {
                const task = argList[0] === '-' ? 'remove' : 'add';
                if (task === 'remove')
                    argList = argList.slice(1);
                if (argList[0] === '"') {
                    const endIndex = argList.indexOf('"', 1);
                    if (endIndex === -1)
                        throw Error('Unable to parse arglist. Could not find matching double quote');
                    args.push({ task, name: argList.slice(1, endIndex) });
                    argList = argList.slice(endIndex + 1).trim();
                }
                else {
                    const endIndex = argList.indexOf(' ', 1);
                    if (endIndex === -1) {
                        args.push({ task, name: argList });
                        argList = '';
                    }
                    else {
                        args.push({ task, name: argList.slice(0, endIndex) });
                        argList = argList.slice(endIndex + 1).trim();
                    }
                }
            }

            if (command.name === 'label') {
                tasks.push(...args.map((arg) => arg.task === 'add'
                    ? this.github.addLabel(arg.name)
                    : this.github.removeLabel(arg.name)));
            }
            console.log("Info argListCopy：", argListCopy.toString())
            if (command.name === 'assign'){
                if(argListCopy === ''){
                    tasks.push(this.github.addAssignee(this.action.user.name));
                }else{
                    tasks.push(...args.map((arg) => arg.task === 'add'
                        ? this.github.addAssignee(arg.name[0] === '@' ? arg.name.slice(1) : arg.name)
                        : this.github.removeAssignee(arg.name[0] === '@' ? arg.name.slice(1) : arg.name)));
                }
            }
        }
        if (command.action === 'close') {
            tasks.push(this.github.closeIssue());
        }
        if (command.comment && (command.action !== 'close' || issue.open)) {
            tasks.push(this.github.postComment(command.comment));
        }
        if (command.addLabel) {
            tasks.push(this.github.addLabel(command.addLabel));
        }
        if (command.removeLabel) {
            tasks.push(this.github.removeLabel(command.removeLabel));
        }
        await Promise.all(tasks);
    }
    async fileFetcher() {
        var xhr = new XMLHttpRequest(); // 创建xhr对象
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4) {
                if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                    // var result = JSON.parse(xhr.responseText); // 将字符串转化为对象，然后才能获取到返回字符串中的某一个值
                    var result = xhr.responseText; // 将字符串转化为对象，然后才能获取到返回字符串中的某一个值
                } else {
                    alert('Request was unsuccessful: ' + xhr.status);
                }
            }
        }
        var url = 'https://raw.githubusercontent.com/oam-dev/kubevela/master/.github/comment.userlist'; // 获取课程列表,带参数的get请求
        xhr.open('get', url, false); // 开启一个请求，但还没有向服务器端发起请求，执行后redayState的值变为1  async 异步  当为false时会响应更快一些，而true会有时没有响应
        xhr.send(null); //  向服务器端发起请求，执行后redayState的值变为2   // 补充：当服务器端开始返回请求数据的时候，浏览器端接收到这个数据，redayState的值变为3。
                             //  当浏览器端结束请求时，redayState的值变为4，status的值变为200（表示请求成功），responseText变为相应的返回值。
        return xhr.responseText.toString()
    }
    async run() {
        const issue = await this.github.getIssue();
        let changedFiles = [];
        if (this.config.find((cmd) => cmd.type === 'changedfiles') !== undefined) {
            console.log('Found changedfiles commands, listing pull request filenames...');
            changedFiles = await this.github.listPullRequestFilenames();
        }
        return Promise.all(this.config.map((command) => this.perform(command, issue, changedFiles)));
    }
}
exports.Commands = Commands;
// From user CoolAJ86 on https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
//# sourceMappingURL=Commands.js.map