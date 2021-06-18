import { exec } from '@actions/exec'

export interface CloneProps {
	token: string
	owner: string
	repo: string
}

export async function cloneRepo({ token, owner, repo }: CloneProps) {
	await exec('git', ['clone', `https://x-access-token:${token}@github.com/${owner}/${repo}.git`])
	await exec('git', ['config', '--global', 'user.email', 'kubevela.bot@aliyun.com'])
	await exec('git', ['config', '--global', 'user.name', 'kubevela-bot'])
}
