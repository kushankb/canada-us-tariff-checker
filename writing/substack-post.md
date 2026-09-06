# The roll is American. The pulp isn't.

*Draft for Substack. The first-person framing is a placeholder — rewrite the
personal bits in your own voice before publishing.*

---

Almost all the toilet paper Americans buy is made in America. The stuff it's
made from is not.

US mills buy their pulp and tissue stock from Canada, more than from anywhere
else. Since 22 August that stock has been taxed 50% on the way in. The finished
rolls sitting on the shelf aren't on the tariff list at all. The raw material
they're made from is.

That gap is the whole thing in miniature. When people talk about tariffs they
picture the finished product getting more expensive at the border. Most of the
time what's actually happening is further upstream, and by the time it reaches
you it doesn't look like a tariff at all. It looks like the price went up.

## What's actually going on

Two separate things, pointing in opposite directions.

The US put a 50% charge on 554 categories of Canadian goods, in force since 22
August. Canada replied with its own list covering 648 categories of American
goods, in force from 8 September, at 15%, 25% or 50% depending on the item.

Between them that's roughly $27.6 billion of trade in each direction. Not
everything, and not the things you'd necessarily guess.

## Three things that surprised me

**Cheap doesn't mean exempt.** I assumed small parcels slipped under the wire.
They don't. Canada's surtax applies to shipments below the duty-free thresholds,
and it applies even where the postal and courier remission orders would normally
give relief. A parcel that owes no ordinary duty can still owe the
counter-tariff.

Carrying something back in your own luggage is genuinely different. Goods within
a traveller's personal exemption aren't surtaxed. So the line that matters isn't
cheap versus expensive. It's posted to you versus carried by you.

**The tariffs stack.** This is the one that catches people. A drinking glass
entering the US already paid a 7.2% duty before any of this started. The new 50%
doesn't replace it. It's added on top. The real number is 57.2%.

Every rate on a tariff list works this way, and almost nobody reading one for
the first time expects it.

**Being left off a list isn't a break.** Steel, aluminium, copper, cars, timber,
semiconductors and patented drugs are all specifically excluded from the main US
tariff. That sounds like good news for anyone shipping steel. It isn't — a
separate rule already taxes steel at 50%. It's the one sector where both
countries landed on exactly the same number, in both directions.

## Why I ended up building something

I wanted to check one product and couldn't. Every official source assumes you
already know your customs classification code, which almost nobody does, and the
lists themselves are published as long tables of numbers with descriptions
written for customs brokers.

So the tool does the translation. You type "toilet paper" or "sweater" or
"hockey stick" and it works out which tariff lines that maps to, tells you the
rate, and shows you what the product already owed before the new charge landed
on top.

A few decisions I'd defend:

It says when it doesn't know. If you search for something and get nothing back,
it tells you whether that means "genuinely not on the list" or "we didn't
understand the word". Those are very different answers and running them together
would be worse than useless. Socks, tomatoes and mattresses really are on neither
list.

It doesn't estimate. Every code comes from Finance Canada's published list or
the US tariff schedule, and every US code is checked back against the live
schedule before it's published. Where a number isn't available, the tool shows
nothing rather than a guess.

And it won't tell you what you'll pay at the till. Tariffs are charged on the
customs value of a shipment, not on a shelf price, and how much of that reaches
a shopper depends on what the importers and retailers decide to absorb.
Anything that claims to convert a tariff rate into your grocery bill is making
that part up.

## The part that took the longest

Not the interface. Reading the sources correctly.

Finance Canada publishes its list on a single page, which looks like one table
and is actually three: the list in force now, and two older ones that have been
superseded. They sit in collapsible sections with slightly different column
layouts. A scraper that grabs the first table it finds gets 314 rows of expired
2025 rates and publishes them as current.

On the US side, the official annexes are published as images, which is why most
write-ups quote category summaries rather than actual codes. But the same lists
are also written into the tariff schedule itself as a legal note, and that comes
as a text document. No transcription, no guessing.

That distinction matters more than it sounds. A tariff tool that's confidently
wrong is worse than no tool, because people make money decisions on it.

## Have a look

[link]

It's free, there's no signup, and it isn't customs advice — for an actual
shipment you want a licensed customs broker. But if you want to know whether the
thing you just ordered got caught, it'll tell you in about five seconds.

If it misses something you'd expect it to find, tell me. That's the most useful
thing anyone can send me right now.

---

## Fact-check notes

Every claim above is checkable against the tool's own data:

- Pulp and tissue stock at 50%: lines 4803.00.40 and 4702.00.00, both named in
  US note 51. Finished toilet paper, 4818.10, is not on the list.
- 7013.99.90 carries a published ordinary duty of 7.2%; plus 50% gives 57.2%.
- 554 US lines, 648 Canadian lines, Canadian rates of 15 / 25 / 50%.
- The de minimis and personal-exemption rules are both stated in CBSA Customs
  Notice 25-10.
- The steel carve-out is US note 51(c).
- The $27.6bn figure is Finance Canada's own.
- "More than from anywhere else" for Canadian toilet paper is the Guardian's
  reporting on World Bank figures — attribute it if you keep it, and drop the
  dollar figure if you'd rather not lean on a secondary source.
