// eslint-disable-next-line @typescript-eslint/no-var-requires
const { faker } = require('@faker-js/faker');

function generateFakeStoreData(requestParams, ctx, ee, next) {
  ctx.vars['name'] = faker.person.fullName();
  ctx.vars['email'] = faker.internet.email();
  ctx.vars['password'] = faker.internet.password();
  ctx.vars['latitude'] = faker.location.latitude();
  ctx.vars['longitude'] = faker.location.longitude();
  ctx.vars['typeOfFood'] = 'Mexican';

  return next();
}

module.exports = {
  generateFakeStoreData,
};
