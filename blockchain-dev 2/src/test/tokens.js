const { expect } = require('chai');
const { keccak256 } = require('@ethersproject/keccak256');
const { toUtf8Bytes } = require('@ethersproject/strings');

const TokensModule = require('../../dist/src/tokens/tokens.controller');
describe('Tokens Controller', () => {
  it('should convert CIDv1 values correctly', async function () {
    let controller = new TokensModule.TokensController();
    await controller.onModuleInit();

    const exampleCIDv1s = [
      'bafkreidbiybabche67to4z4teql26j4ycfbxlmflm4fmbsjbhb4mvcu5zu',
      'bafkreibf7tddxgfftnabndbox6lku6iupizbprjlrv4z2bngrgg746qe3y',
      'bafkreiftv5s7oo64nmw2ctow64sqgyxbohe5am3vifwbq6qv6qikz46ao4',
    ];
    const exampleHashes = [
      '0x6146020088e4f7e6ee67932417af2798114375b0ab670ac0c9213878ca8a9dcd',
      '0x25fcc63b98a59b40168c2ebf96aa79147a3217c52b8d799d05a6898dfe7a04de',
      '0xb3af65f73bdc6b2da14dd6f7250362e171c9d03375416c187a15f410acf3c077',
    ];

    for (let i = 0; i < exampleCIDv1s.length; i++) {
      let testCIDv1 = exampleCIDv1s[i];
      let testHash = exampleHashes[i];

      expect(controller.toHexHash(testCIDv1)).to.equal(testHash);
      expect(controller.toCIDv1(testHash)).to.equal(testCIDv1);
      expect(controller.toCIDv1(controller.toHexHash(testCIDv1))).to.equal(testCIDv1);
      expect(controller.toHexHash(controller.toCIDv1(testHash))).to.equal(testHash);
    }
  }).timeout(10000);

  it('should convert ZERO_HASH correctly', async function () {
    let controller = new TokensModule.TokensController();
    await controller.onModuleInit();
    const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const ZERO_CIDv1 = 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(controller.toCIDv1(ZERO_HASH)).to.equal(ZERO_CIDv1);
    expect(controller.toHexHash(controller.toCIDv1(ZERO_HASH))).to.equal(ZERO_HASH);
  }).timeout(10000);

  it('should convert test hash values correctly', async function () {
    let controller = new TokensModule.TokensController();
    await controller.onModuleInit();

    const DATA_HASH = keccak256(toUtf8Bytes('DATA_HASH'));
    expect(controller.toHexHash(controller.toCIDv1(DATA_HASH))).to.equal(DATA_HASH);
    const ADMIN_HASH_1 = keccak256(toUtf8Bytes('ADMIN_HASH_1'));
    expect(controller.toHexHash(controller.toCIDv1(ADMIN_HASH_1))).to.equal(ADMIN_HASH_1);
    const OWNER_HASH_1 = keccak256(toUtf8Bytes('OWNER_HASH_1'));
    expect(controller.toHexHash(controller.toCIDv1(OWNER_HASH_1))).to.equal(OWNER_HASH_1);
    const ADMIN_HASH_2 = keccak256(toUtf8Bytes('ADMIN_HASH_2'));
    expect(controller.toHexHash(controller.toCIDv1(ADMIN_HASH_2))).to.equal(ADMIN_HASH_2);
    const OWNER_HASH_2 = keccak256(toUtf8Bytes('OWNER_HASH_2'));
    expect(controller.toHexHash(controller.toCIDv1(OWNER_HASH_2))).to.equal(OWNER_HASH_2);
    const ADMIN_HASH_3 = keccak256(toUtf8Bytes('ADMIN_HASH_3'));
    expect(controller.toHexHash(controller.toCIDv1(ADMIN_HASH_3))).to.equal(ADMIN_HASH_3);
    const OWNER_HASH_3 = keccak256(toUtf8Bytes('OWNER_HASH_3'));
    expect(controller.toHexHash(controller.toCIDv1(OWNER_HASH_3))).to.equal(OWNER_HASH_3);
  }).timeout(10000);
});
