import { isCardGrpcCompliant } from './GrpcValidation';

const card: any = {
  targetName: 'BigMoney',
  clientName: ['SRPFeCrUn'],
  cardBankName: 'Srp F.c.u.',
  cardLevel: 'Classic',
  firstSeenDate: '2020-11-08T11:36:18.665Z',
  cardBin: '448232',
  sourceCoverName: 'Oyster-20691',
  price: 11.0,
  lastAvailableDate: '2020-11-09T10:36:30.581Z',
  shopId: 'auto-248a5999b52fd92f07cdcc9364325165',
  riskScore: 0.0,
  id: 'BigMoney:auto-248a5999b52fd92f07cdcc9364325165',
  cardExpiration: '08/2024',
  cardBrand: 'Visa',
  baseName: 'MIX#51 07.11.2020 /',
  quantity: 1,
  cardTrack1: 'NO',
  cardCountry: 'United States',
  cardType: 'Debit',
  tags: [
    'percId_SRPFeCrUn_generated_546729546',
    'SRPFeCrUn_card_bin',
    'clientName_SRPFeCrUn',
    'SRPFeCrUn',
  ],
  cardSvc: '201',
  accountHolderZip: '',
  accountHolderState: 'Florida',
  accountHolderCity: 'Miami',
  cardSource: 'DUMP',
  lastCollectionSessionId: 'f835bef0-210f-11eb-9278-8337bf8d588a',
  status: 'AVAILABLE',
  fetchDate: '2020-11-09T10:36:30.581Z',
};

const emptyCard = {};

const badCard = { ...card };
badCard.x = ['x'];

const badCard2 = { ...card };
badCard2.targetName = 123;

describe('GrpcValidation', () => {
  it('It should detect an empty card', () => {
    expect(isCardGrpcCompliant(emptyCard)).toBeFalsy();
  });

  it('It should detect a bad card', () => {
    expect(isCardGrpcCompliant(badCard)).toBeFalsy();
  });

  it('It should detect a card with a bad data type', () => {
    expect(isCardGrpcCompliant(badCard2)).toBeFalsy();
  });

  it('It should parse a good card', () => {
    expect(isCardGrpcCompliant(card)).toBeTruthy();
  });
});
