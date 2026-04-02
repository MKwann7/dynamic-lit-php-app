curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install node
npm install -D tsx typescript
npm install mysql2


make ui-component location="account/sites/list" name="My Sites" tag="my-sites-list" uri="my-sites"

build:component @maxr/my-sites-list


make ui-component location="managers/media/images" name="Manage Image" tag="manage-image" uri="manage-image"