/*eslint-env node*/

const gulp = require('gulp');
const rename = require('gulp-rename');
const spawnSync = require('child_process').spawnSync;
//Only used for `reset-dev` because htat uses subcommands
const exec = require('child_process').exec;
const prompts = require('prompts');
const fs = require('fs');
const process = require('process');
const inject = require('gulp-inject-string');

let projectConfig;
try {
	projectConfig = require('./config.SECRET.json');
} catch(err) {
	console.log('config.SECRET.json didn\'t exist. Check README.md on how to create one');
	process.exit(1);
}
const CONFIG_FIREBASE_PROD = projectConfig.firebase.prod ? projectConfig.firebase.prod : projectConfig.firebase;
const CONFIG_FIREBASE_DEV = projectConfig.firebase.dev ? projectConfig.firebase.dev : CONFIG_FIREBASE_PROD;

const CHANGE_ME_SENTINEL = 'CHANGE-ME';

const FIREBASE_PROD_PROJECT = CONFIG_FIREBASE_PROD.projectId;
const FIREBASE_DEV_PROJECT = CONFIG_FIREBASE_DEV.projectId;

const BACKUP_BUCKET_NAME = projectConfig.backup_bucket_name && projectConfig.backup_bucket_name != CHANGE_ME_SENTINEL ? projectConfig.backup_bucket_name : ''; 

const APP_TITLE = projectConfig.app_title ? projectConfig.app_title : 'Cards Web';
const APP_DESCRIPTION = projectConfig.app_description || APP_TITLE;
const GOOGLE_ANALYTICS = projectConfig.google_analytics && projectConfig.google_analytics != CHANGE_ME_SENTINEL ? projectConfig.google_analytics : 'UA-321674-11';

const TWITTER_HANDLE = projectConfig.twitter_handle && projectConfig.twitter_handle != CHANGE_ME_SENTINEL ? projectConfig.twitter_handle : '';

const DO_TAG_RELEASES = projectConfig.tag_releases || false;

const USER_TYPE_ALL_PERMISSIONS = projectConfig.permissions && projectConfig.permissions.all || {};
const USER_TYPE_ANONYMOUS_PERMISSIONS = projectConfig.permissions && projectConfig.permissions.anonymous || {};
const USER_TYPE_SIGNED_IN_PERMISSIONS = projectConfig.permissions && projectConfig.permissions.signed_in || {};
const USER_TYPE_SIGNED_IN_DOMAIN_PERMISSIONS = projectConfig.permissions && projectConfig.permissions.signed_in_domain || {};

const DISABLE_PERSISTENCE = projectConfig.disable_persistence || false;
const DISABLE_ANONYMOUS_LOGIN = projectConfig.disable_anonymous_login || false;
const DISABLE_SERVICE_WORKER = projectConfig.disable_service_worker || false;
const DISABLE_CALLABLE_CLOUD_FUNCTIONS = projectConfig.disable_callable_cloud_functions || false;

const TAB_CONFIGURATION = projectConfig.tabs || null;
const TAB_OVERRIDES_CONFIGURATION = projectConfig.tab_overrides || null;

const verifyPermissionsLegal = (permissions) => {
	for (let [key, val] of Object.entries(permissions)) {
		if (key == 'admin') {
			throw new Error('Permissions objects may not list admin privileges for all users of a given type; it must be on the user object in firestore directly');
		}
		if (!val) {
			throw new Error('Permissions objects may only contain true keys');
		}
	}
};

verifyPermissionsLegal(USER_TYPE_ALL_PERMISSIONS);
verifyPermissionsLegal(USER_TYPE_ANONYMOUS_PERMISSIONS);
verifyPermissionsLegal(USER_TYPE_SIGNED_IN_PERMISSIONS);
verifyPermissionsLegal(USER_TYPE_SIGNED_IN_DOMAIN_PERMISSIONS);


const FIREBASE_REGION = projectConfig.region || 'us-central1';

const USER_DOMAIN = projectConfig.user_domain || '';

const makeExecExecutor = cmd => {
	return function (cb) {
		console.log('Running ' + cmd);
		exec(cmd, function (err, stdout, stderr) {
			console.log(stdout);
			console.log(stderr);
			cb(err);
		});
	};
};

const makeExecutor = cmdAndArgs => {
	return (cb) => {
		const splitCmd = cmdAndArgs.split(' ');
		const cmd = splitCmd[0];
		const args = splitCmd.slice(1);
		const result = spawnSync(cmd, args, {
			stdio: 'inherit'
		});
		cb(result.error);
	};
};

const BUILD_TASK = 'build';
const BUILD_OPTIONALLY = 'build-optionally';
const ASK_IF_WANT_BUILD = 'ask-if-want-build';
const FIREBASE_ENSURE_PROD_TASK = 'firebase-ensure-prod';
const FIREBASE_DEPLOY_TASK = 'firebase-deploy';
const FIREBASE_SET_CONFIG_LAST_DEPLOY_AFFECTING_RENDERING = 'firebase-set-config-last-deploy-affecting-rendering';
const GCLOUD_ENSURE_PROD_TASK = 'gcloud-ensure-prod';
const GCLOUD_BACKUP_TASK = 'gcloud-backup';
const MAKE_TAG_TASK = 'make-tag';
const PUSH_TAG_TASK = 'push-tag';
const SET_LAST_DEPLOY_IF_AFFECTS_RENDERING = 'set-last-deploy-if-affects-rendering';
const ASK_IF_DEPLOY_AFFECTS_RENDERING = 'ask-if-deploy-affects-rendering';
const ASK_BACKUP_MESSAGE = 'ask-backup-message';
const SET_UP_CORS = 'set-up-cors';

const GCLOUD_ENSURE_DEV_TASK = 'gcloud-ensure-dev';
const FIREBASE_ENSURE_DEV_TASK = 'firebase-ensure-dev';
const FIREBASE_DELETE_FIRESTORE_IF_SAFE_TASK = 'firebase-delete-firestore-if-safe';
const FIREBASE_DELETE_FIRESTORE_TASK = 'DANGEROUS-firebase-delete-firestore';
const GCLOUD_RESTORE_TASK = 'gcloud-restore';
const GSUTIL_RSYNC_UPLOADS = 'gsutil-rsync-uploads';

const WARN_MAINTENANCE_TASKS = 'warn-maintenance-tasks';

const REGENERATE_FILES_FROM_CONFIG_TASK = 'inject-config';

gulp.task(REGENERATE_FILES_FROM_CONFIG_TASK, function(done) {

	let CONFIG_JS_CONTENT = '// Generated by `gulp ' + REGENERATE_FILES_FROM_CONFIG_TASK + '`\n';
	CONFIG_JS_CONTENT += 'import { FirebaseOptions } from \'firebase/app\';\n';
	CONFIG_JS_CONTENT += 'import { TabConfig, TabConfigOverrides, UserPermissions } from \'./types.js\';\n\n';
	CONFIG_JS_CONTENT += 'export const FIREBASE_DEV_CONFIG : FirebaseOptions = ' + JSON.stringify(CONFIG_FIREBASE_DEV).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const FIREBASE_PROD_CONFIG : FirebaseOptions = ' + JSON.stringify(CONFIG_FIREBASE_PROD).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const APP_TITLE = \'' + APP_TITLE + '\';\n';
	CONFIG_JS_CONTENT += 'export const USER_TYPE_ALL_PERMISSIONS : UserPermissions = ' + JSON.stringify(USER_TYPE_ALL_PERMISSIONS).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const USER_TYPE_ANONYMOUS_PERMISSIONS : UserPermissions = ' + JSON.stringify(USER_TYPE_ANONYMOUS_PERMISSIONS).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const USER_TYPE_SIGNED_IN_PERMISSIONS : UserPermissions = ' + JSON.stringify(USER_TYPE_SIGNED_IN_PERMISSIONS).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const USER_TYPE_SIGNED_IN_DOMAIN_PERMISSIONS : UserPermissions = ' + JSON.stringify(USER_TYPE_SIGNED_IN_DOMAIN_PERMISSIONS).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const USER_DOMAIN = \'' + USER_DOMAIN + '\';\n';
	CONFIG_JS_CONTENT += 'export const FIREBASE_REGION = \'' + FIREBASE_REGION + '\';\n';
	CONFIG_JS_CONTENT += 'export const TWITTER_HANDLE = \'' + TWITTER_HANDLE + '\';\n';
	CONFIG_JS_CONTENT += 'export const TAB_CONFIGURATION : TabConfig = ' + JSON.stringify(TAB_CONFIGURATION).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const TAB_OVERRIDES_CONFIGURATION : TabConfigOverrides = ' + JSON.stringify(TAB_OVERRIDES_CONFIGURATION).split('"').join('\'') + ';\n';
	CONFIG_JS_CONTENT += 'export const DISABLE_PERSISTENCE = ' + (DISABLE_PERSISTENCE ? 'true' : 'false') + ';\n';
	CONFIG_JS_CONTENT += 'export const DISABLE_ANONYMOUS_LOGIN = ' + (DISABLE_ANONYMOUS_LOGIN ? 'true' : 'false') + ';\n';
	CONFIG_JS_CONTENT += 'export const DISABLE_CALLABLE_CLOUD_FUNCTIONS = ' + (DISABLE_CALLABLE_CLOUD_FUNCTIONS ? 'true' : 'false') + ';\n';
	fs.writeFileSync('src/config.GENERATED.SECRET.ts', CONFIG_JS_CONTENT);

	let META_STRING = '\n    <meta name="application-name" content="' + APP_TITLE + '">\n';
	META_STRING += '    <meta property="og:site_name" content="' + APP_TITLE + '">\n';
	if (TWITTER_HANDLE) {
		META_STRING += '    <meta name="twitter:site" content="@' + TWITTER_HANDLE + '">\n';
	}

	let stream = gulp.src('./index.TEMPLATE.html')
		.pipe(inject.after('<!-- INJECT-META-HERE -->', META_STRING))
		.pipe(inject.replace('@TITLE@', APP_TITLE))
		.pipe(inject.replace('@DESCRIPTION@',APP_DESCRIPTION))
		.pipe(inject.replace('@GOOGLE_ANALYTICS@', GOOGLE_ANALYTICS));

	if (DISABLE_SERVICE_WORKER) {
		stream = stream.pipe(inject.after('SERVICE-WORKER-START*/', '/*'));
	}
	
	stream.pipe(rename('index.html'))
		.pipe(gulp.dest('./'));

	const COMPOSED_USER_TYPE_ALL_PERMISSIONS = {...USER_TYPE_ALL_PERMISSIONS};
	const COMPOSED_USER_TYPE_ANOYMOUS_PERMISSIONS = {...COMPOSED_USER_TYPE_ALL_PERMISSIONS, ...USER_TYPE_ANONYMOUS_PERMISSIONS};
	const COMPOSED_USER_TYPE_SIGNED_IN_PERMISSIONS = {...COMPOSED_USER_TYPE_ANOYMOUS_PERMISSIONS, ...USER_TYPE_SIGNED_IN_PERMISSIONS};
	const COMPOSED_USER_TYPE_SIGNED_IN_DOMAIN_PERMISSIONS = {...COMPOSED_USER_TYPE_SIGNED_IN_PERMISSIONS, ...USER_TYPE_SIGNED_IN_DOMAIN_PERMISSIONS};

	const USER_TYPE_ALL_RULES_STRING = '\n      let rules=' + JSON.stringify(COMPOSED_USER_TYPE_ALL_PERMISSIONS) + ';';
	const USER_TYPE_ANONYMOUS_RULES_STRING = '\n      let rules=' + JSON.stringify(COMPOSED_USER_TYPE_ANOYMOUS_PERMISSIONS) + ';';
	const USER_TYPE_SIGNED_IN_RULES_STRING = '\n      let rules=' + JSON.stringify(COMPOSED_USER_TYPE_SIGNED_IN_PERMISSIONS) + ';';
	const USER_TYPE_SIGNED_IN_DOMAIN_RULES_STRING = '\n      let rules=' + JSON.stringify(COMPOSED_USER_TYPE_SIGNED_IN_DOMAIN_PERMISSIONS) + ';';
	const USER_DOMAIN_RULES_STRING = '\n      let domain="' + USER_DOMAIN  + '";';

	gulp.src('./firestore.TEMPLATE.rules')
		.pipe(inject.after('//inject here:all', USER_TYPE_ALL_RULES_STRING))
		.pipe(inject.after('//inject here:anonymous', USER_TYPE_ANONYMOUS_RULES_STRING))
		.pipe(inject.after('//inject here:signed_in', USER_TYPE_SIGNED_IN_RULES_STRING))
		.pipe(inject.after('//inject here:signed_in_domain', USER_TYPE_SIGNED_IN_DOMAIN_RULES_STRING))
		.pipe(inject.after('//inject here:domain', USER_DOMAIN_RULES_STRING))
		.pipe(rename('firestore.rules'))
		.pipe(gulp.dest('./'));

	done();
});

const pad = (num) => {
	let str =  '' + num;
	if (str.length < 2) {
		str = '0' + str;
	}
	return str;
};

const releaseTag = () =>{
	let d = new Date();
	//need to pad all items to ensure that the lexicographic sorting is in the rihgt order
	return 'deploy-' + d.getFullYear() + '-' + pad((d.getMonth() + 1)) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + '-' + pad(d.getMinutes());
};

const RELEASE_TAG = releaseTag();

//Will be set by FIREBASE_USE_PROD and FIREBASE_USE_DEV_TASK to ensure they
//don't get run again
let firebase_is_prod = undefined;
const firebaseUseProd = makeExecutor('firebase use ' + FIREBASE_PROD_PROJECT);
const firebaseUseDev = makeExecutor('firebase use ' + FIREBASE_DEV_PROJECT);

gulp.task(FIREBASE_ENSURE_PROD_TASK, (cb) => {
	if (firebase_is_prod) {
		console.log('Already using prod');
		cb();
		return;
	}
	firebase_is_prod = true;
	firebaseUseProd(cb);
});

gulp.task(FIREBASE_ENSURE_DEV_TASK, (cb) => {
	if (firebase_is_prod === false) {
		console.log('Already using dev');
		cb();
		return;
	}
	firebase_is_prod = false;
	firebaseUseDev(cb);
});

gulp.task(FIREBASE_DELETE_FIRESTORE_IF_SAFE_TASK, async (cb) => {
	const task = gulp.task(FIREBASE_DELETE_FIRESTORE_TASK);
	if (FIREBASE_DEV_PROJECT == FIREBASE_PROD_PROJECT) {
		const response = await prompts({
			type:'confirm',
			name: 'value',
			initial: false,
			message: 'You don\'t have a dev configuration. Do you really want to delete all prod data?',
		});
	
		if(!response.value) {
			process.exit(1);
		}
	}
	task(cb);
});

//Will be set by GCLOUD_USE_PROD and GCLOUD_USE_DEV_TASK to ensure they
//don't get run again
let gcloud_is_prod = undefined;
const gcloudUseProd = makeExecutor('gcloud config set project ' + FIREBASE_PROD_PROJECT);
const gcloudUseDev = makeExecutor('gcloud config set project ' + FIREBASE_DEV_PROJECT);

gulp.task(GCLOUD_ENSURE_PROD_TASK, (cb) => {
	if (gcloud_is_prod) {
		console.log('Already using prod');
		cb();
		return;
	}
	gcloud_is_prod = true;
	gcloudUseProd(cb);
});

gulp.task(GCLOUD_ENSURE_DEV_TASK, (cb) => {
	if (gcloud_is_prod === false) {
		console.log('Already using dev');
		cb();
		return;
	}
	gcloud_is_prod = false;
	gcloudUseDev(cb);
});

gulp.task(BUILD_TASK, makeExecutor('npm run build'));

gulp.task(FIREBASE_DEPLOY_TASK, makeExecutor(TWITTER_HANDLE ? 'firebase deploy' : 'firebase deploy --only hosting,storage,firestore,functions:emailAdminOnMessage,functions:emailAdminOnStar,functions:legal'));

gulp.task(FIREBASE_SET_CONFIG_LAST_DEPLOY_AFFECTING_RENDERING, makeExecutor('firebase functions:config:set site.last_deploy_affecting_rendering=' + RELEASE_TAG));

//If there is no dev then we'll just set it twice, no bigge
gulp.task(SET_UP_CORS, gulp.series(
	makeExecutor('gsutil cors set cors.json gs://' + CONFIG_FIREBASE_DEV.storageBucket),
	makeExecutor('gsutil cors set cors.json gs://' + CONFIG_FIREBASE_PROD.storageBucket),
));

gulp.task(GCLOUD_BACKUP_TASK, cb => {
	if (!BACKUP_BUCKET_NAME) {
		console.log('Skipping backup since no backup_bucket_name set');
		cb();
		return;
	}
	//BACKUP_MESSAGE won't be known until later
	const task = makeExecutor('gcloud beta firestore export gs://' + BACKUP_BUCKET_NAME + '/' + RELEASE_TAG + (BACKUP_MESSAGE ? '-' + BACKUP_MESSAGE : ''));
	task(cb);
});

gulp.task(MAKE_TAG_TASK, makeExecutor('git tag ' + RELEASE_TAG));

gulp.task(PUSH_TAG_TASK, makeExecutor('git push origin ' + RELEASE_TAG));

gulp.task(FIREBASE_DELETE_FIRESTORE_TASK, makeExecutor('firebase firestore:delete --all-collections --force'));

//run doesn't support sub-commands embedded in the command, so use exec.
gulp.task(GCLOUD_RESTORE_TASK, cb => {
	if (!BACKUP_BUCKET_NAME) {
		cb(new Error('Cannot restore backup, no config.backup_bucket_name set'));
		return;
	}
	const task = makeExecExecutor('gcloud beta firestore import $(gsutil ls gs://' + BACKUP_BUCKET_NAME + ' | tail -n 1)');
	task(cb);
});

gulp.task(GSUTIL_RSYNC_UPLOADS, makeExecutor('gsutil rsync -r gs://' + CONFIG_FIREBASE_PROD.storageBucket + '/uploads gs://' + CONFIG_FIREBASE_DEV.storageBucket + '/uploads'));

let BACKUP_MESSAGE = '';

gulp.task(ASK_BACKUP_MESSAGE, async (cb) => {
	//Backups won't be used
	if (!BACKUP_BUCKET_NAME) {
		cb();
		return;
	}
	if (BACKUP_MESSAGE) {
		console.log('Backup message already set');
		cb();
		return;
	}
	const response = await prompts({
		type: 'text',
		name: 'value',
		message: 'Optional message for backup (for example to explain the reason why backup was run)'
	});

	let message = response.value;
	message = message.split(' ').join('-');
	if (!message.match('^[A-Za-z0-9-]*$')) {
		cb('Message contained illegal characters');
		return;
	}
	BACKUP_MESSAGE = message;
	cb();
});

let deployAffectsRendering = undefined;

gulp.task(ASK_IF_DEPLOY_AFFECTS_RENDERING, async (cb) => {
	if (deployAffectsRendering !== undefined) {
		console.log('Already asked if deploy affects rendering');
		cb();
		return;
	}
	const response = await prompts({
		type:'confirm',
		name: 'value',
		initial: false,
		message: 'Could the webapp in this deploy possibly affect rendering of cards?',
	});

	deployAffectsRendering = response.value;
	cb();

});

gulp.task(SET_LAST_DEPLOY_IF_AFFECTS_RENDERING, (cb) => {
	let task = gulp.task(FIREBASE_SET_CONFIG_LAST_DEPLOY_AFFECTING_RENDERING);
	if (!deployAffectsRendering) {
		console.log('Skipping setting config because deploy doesn\'t affect rendering');
		cb();
		return;
	}
	task(cb);
});

let wantsToSkipBuild = undefined;

gulp.task(ASK_IF_WANT_BUILD, async (cb) => {
	if (wantsToSkipBuild !== undefined) {
		console.log('Already asked if the user wants a build');
		cb();
		return;
	}
	const response = await prompts({
		type:'confirm',
		name: 'value',
		initial: false,
		message: 'Do you want to skip building, because the build output is already up to date?',
	});

	wantsToSkipBuild = response.value;
	cb();

});

gulp.task(WARN_MAINTENANCE_TASKS, (cb) => {
	console.log(`******************************************************************
*                 WARNING 
*     You may need to run maintenance tasks. 
*     Go to https://<YOUR-APPS-DOMAIN>/maintenance
*     Ensure you're logged in as an admin
*     Hard refresh (Ctrl-Shift-R)
*     Run any maintenance tasks it tells you to.
*
******************************************************************`);
	cb();
});

gulp.task(BUILD_OPTIONALLY, async (cb) => {
	let task = gulp.task(BUILD_TASK);
	if (wantsToSkipBuild) {
		console.log('Skipping build because the user asked to skip it');
		cb();
		return;
	}
	task(cb);
});

gulp.task('set-up-deploy',
	gulp.series(
		SET_UP_CORS,
		FIREBASE_ENSURE_PROD_TASK,
		makeExecutor('firebase deploy --only firestore,storage')
	)
);

gulp.task('dev-deploy',
	gulp.series(
		REGENERATE_FILES_FROM_CONFIG_TASK,
		ASK_IF_WANT_BUILD,
		BUILD_OPTIONALLY,
		ASK_IF_DEPLOY_AFFECTS_RENDERING,
		FIREBASE_ENSURE_DEV_TASK,
		SET_LAST_DEPLOY_IF_AFFECTS_RENDERING,
		FIREBASE_DEPLOY_TASK
	)
);

gulp.task('deploy', 
	gulp.series(
		REGENERATE_FILES_FROM_CONFIG_TASK,
		ASK_IF_WANT_BUILD,
		BUILD_OPTIONALLY,
		ASK_IF_DEPLOY_AFFECTS_RENDERING,
		FIREBASE_ENSURE_PROD_TASK,
		SET_LAST_DEPLOY_IF_AFFECTS_RENDERING,
		FIREBASE_DEPLOY_TASK,
		WARN_MAINTENANCE_TASKS,
	)
);

gulp.task('backup', 
	gulp.series(
		ASK_BACKUP_MESSAGE,
		GCLOUD_ENSURE_PROD_TASK,
		GCLOUD_BACKUP_TASK,
	)
);

gulp.task('tag-release', 
	gulp.series(
		MAKE_TAG_TASK,
		PUSH_TAG_TASK
	)
);

gulp.task('maybe-tag-release', (cb) => {
	const task = gulp.task('tag-release');
	if (!DO_TAG_RELEASES) {
		cb();
		return;
	}
	task(cb);
});

gulp.task('release', 
	gulp.series(
		//Ask at the beginning so the user can walk away after running
		ASK_IF_DEPLOY_AFFECTS_RENDERING,
		ASK_BACKUP_MESSAGE,
		ASK_IF_WANT_BUILD,
		'backup',
		'deploy',
		'maybe-tag-release'
	)
);

gulp.task('reset-dev',
	gulp.series(
		GCLOUD_ENSURE_DEV_TASK,
		FIREBASE_ENSURE_DEV_TASK,
		FIREBASE_DELETE_FIRESTORE_IF_SAFE_TASK,
		GCLOUD_RESTORE_TASK,
		GSUTIL_RSYNC_UPLOADS
	)
);

var realFavicon = require ('gulp-real-favicon');

// File where the favicon markups are stored
var FAVICON_DATA_FILE = 'favicon_data.json';

// Generate the icons. This task takes a few seconds to complete.
// You should run it at least once to create the icons. Then,
// you should run it whenever RealFaviconGenerator updates its
// package (see the check-for-favicon-update task below).
gulp.task('generate-favicon', function(done) {
	realFavicon.generateFavicon({
		masterPicture: 'logo.svg',
		dest: 'images/',
		iconsPath: '/images',
		design: {
			ios: {
				pictureAspect: 'backgroundAndMargin',
				backgroundColor: '#ffffff',
				margin: '14%',
				assets: {
					ios6AndPriorIcons: false,
					ios7AndLaterIcons: false,
					precomposedIcons: false,
					declareOnlyDefaultIcon: true
				}
			},
			desktopBrowser: {
				design: 'raw'
			},
			windows: {
				pictureAspect: 'whiteSilhouette',
				backgroundColor: '#603cba',
				onConflict: 'override',
				assets: {
					windows80Ie10Tile: false,
					windows10Ie11EdgeTiles: {
						small: false,
						medium: true,
						big: false,
						rectangle: false
					}
				}
			},
			androidChrome: {
				pictureAspect: 'shadow',
				themeColor: '#ffffff',
				manifest: {
					name: APP_TITLE,
					display: 'standalone',
					orientation: 'notSet',
					onConflict: 'override',
					declared: true
				},
				assets: {
					legacyIcon: false,
					lowResolutionIcons: false
				}
			},
			safariPinnedTab: {
				pictureAspect: 'silhouette',
				themeColor: '#5e2b97'
			}
		},
		settings: {
			scalingAlgorithm: 'Mitchell',
			errorOnImageTooSmall: false,
			readmeFile: false,
			htmlCodeFile: false,
			usePathAsIs: false
		},
		markupFile: FAVICON_DATA_FILE
	}, function() {
		done();
	});
});

// Inject the favicon markups in your HTML pages. You should run
// this task whenever you modify a page. You can keep this task
// as is or refactor your existing HTML pipeline.
gulp.task('inject-favicon-markups', function() {
	return gulp.src([ 'index.html' ])
		.pipe(realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
		.pipe(gulp.dest('.'));
});

// Check for updates on RealFaviconGenerator (think: Apple has just
// released a new Touch icon along with the latest version of iOS).
// Run this task from time to time. Ideally, make it part of your
// continuous integration system.
gulp.task('check-for-favicon-update', function(done) {
	var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
	realFavicon.checkForUpdates(currentVersion, function(err) {
		if (err) {
			throw err;
		}
	});
	done();
});