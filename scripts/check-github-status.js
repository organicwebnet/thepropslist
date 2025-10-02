#!/usr/bin/env node

/**
 * GitHub Actions Status Checker
 * 
 * This script checks the status of recent GitHub Actions workflows
 * and provides information about any failures.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const GITHUB_OWNER = 'organicwebnet';
const GITHUB_REPO = 'the_props_bible';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set this as an environment variable

if (!GITHUB_TOKEN) {
  console.log('❌ GITHUB_TOKEN environment variable not set');
  console.log('Please set your GitHub token: export GITHUB_TOKEN=your_token_here');
  process.exit(1);
}

async function makeGitHubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}${endpoint}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'GitHub-Actions-Status-Checker',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkWorkflowRuns() {
  try {
    console.log('🔍 Checking recent workflow runs...\n');
    
    const runs = await makeGitHubRequest('/actions/runs?per_page=10');
    
    if (!runs.workflow_runs || runs.workflow_runs.length === 0) {
      console.log('❌ No workflow runs found');
      return;
    }

    console.log(`📊 Found ${runs.workflow_runs.length} recent workflow runs:\n`);

    for (const run of runs.workflow_runs) {
      const status = run.status;
      const conclusion = run.conclusion;
      const workflowName = run.name;
      const branch = run.head_branch;
      const createdAt = new Date(run.created_at).toLocaleString();
      const runUrl = run.html_url;

      // Status emoji
      let statusEmoji = '🔄';
      if (status === 'completed') {
        if (conclusion === 'success') {
          statusEmoji = '✅';
        } else if (conclusion === 'failure') {
          statusEmoji = '❌';
        } else if (conclusion === 'cancelled') {
          statusEmoji = '⏹️';
        }
      } else if (status === 'in_progress') {
        statusEmoji = '🔄';
      }

      console.log(`${statusEmoji} ${workflowName}`);
      console.log(`   Branch: ${branch}`);
      console.log(`   Status: ${status}${conclusion ? ` (${conclusion})` : ''}`);
      console.log(`   Created: ${createdAt}`);
      console.log(`   URL: ${runUrl}`);
      console.log('');

      // If it's a failure, get more details
      if (conclusion === 'failure') {
        console.log('   🔍 Getting failure details...');
        try {
          const jobs = await makeGitHubRequest(`/actions/runs/${run.id}/jobs`);
          if (jobs.jobs && jobs.jobs.length > 0) {
            for (const job of jobs.jobs) {
              if (job.conclusion === 'failure') {
                console.log(`   ❌ Failed Job: ${job.name}`);
                console.log(`   📝 Steps:`);
                for (const step of job.steps) {
                  if (step.conclusion === 'failure') {
                    console.log(`      - ${step.name}: ${step.conclusion}`);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.log(`   ⚠️  Could not get job details: ${e.message}`);
        }
        console.log('');
      }
    }

    // Summary
    const failedRuns = runs.workflow_runs.filter(run => run.conclusion === 'failure');
    const successRuns = runs.workflow_runs.filter(run => run.conclusion === 'success');
    const inProgressRuns = runs.workflow_runs.filter(run => run.status === 'in_progress');

    console.log('📈 Summary:');
    console.log(`   ✅ Successful: ${successRuns.length}`);
    console.log(`   ❌ Failed: ${failedRuns.length}`);
    console.log(`   🔄 In Progress: ${inProgressRuns.length}`);

    if (failedRuns.length > 0) {
      console.log('\n🚨 Action Required:');
      console.log('   There are failed workflow runs that need attention.');
      console.log('   Check the URLs above for detailed logs and error information.');
    }

  } catch (error) {
    console.error('❌ Error checking workflow runs:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 GitHub Actions Status Checker');
  console.log(`📁 Repository: ${GITHUB_OWNER}/${GITHUB_REPO}\n`);
  
  await checkWorkflowRuns();
  
  console.log('\n✨ Status check complete!');
}

// Run the script
main().catch(console.error);
