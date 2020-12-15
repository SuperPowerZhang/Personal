rm -rf dist  &&
yarn build  &&
cd dist  &&
git init  &&
git add .  &&
git commit -m "update"  &&
git remote add gitee  git@gitee.com:tammiezhang/selfintro_en.git &&
git push  -u -f gitee master &&
cd -  &&
echo https://tammiezhang.gitee.io/selfintro_en/