set -e

npm run build

cd cdk/
npm run build
AWS_PROFILE=joseph-personal npx cdk deploy