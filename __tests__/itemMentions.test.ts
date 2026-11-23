import { findItemMentions } from '../src/itemMentions';

const sticker = { id: '1', name: '스티커' };
const otherSticker = { id: '2', name: '스티커' };
const starSticker = { id: '3', name: '별 스티커' };
const scissors = { id: '4', name: '가위' };
const items = [sticker, otherSticker, starSticker, scissors];

test.each(['야 스티커 어딨냐', '혹시 스티커 본 적 있어?', '내 스티커는 어디다 넣었더라'])(
  '말투와 상관없이 등록한 이름을 찾는다 (%s)',
  (question) => {
    expect(findItemMentions(question, items)).toEqual([sticker, otherSticker]);
  },
);

test('겹치는 이름은 가장 긴 이름을 고르고 여러 물건은 모두 찾는다', () => {
  expect(findItemMentions('별 스티커랑 가위 어디 있어?', items)).toEqual([starSticker, scissors]);
  expect(findItemMentions('스티커랑 가위랑 스티커 어디 있어?', items)).toEqual([sticker, otherSticker, scissors]);
});

test('이름이 없거나 다른 단어 안에만 있으면 결과를 만들지 않는다', () => {
  expect(findItemMentions('아까 쓰던 그거 어딨냐', items)).toEqual([]);
  expect(findItemMentions('스티커북 어디 있어?', items)).toEqual([]);
});
