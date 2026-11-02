# A lending library, from the ground up

This tutorial explains how a small lending library works: what it holds,
who may borrow, and the rules that keep books moving. Nothing in it
describes any real library.

## 1. What a library is

A lending library is a collection of items that are lent out and returned,
rather than sold. Two things make it a library and not a shop or a reading
room: the items leave the building, and they come back. Everything else,
cards, due dates, fines and holds, exists to make sure of the second.

## 2. Members and cards

A member is a person the library has registered. Registration happens once,
at the desk, and the library issues a card. The card is how the desk
recognises a member, but the card is not the membership: a lost card is
replaced, and the member's loans, holds and history carry on unchanged. A
card that has been replaced no longer works, so a found card cannot be used
by whoever found it.

## 3. Titles and copies

The catalogue lists titles. A title is the work: a particular novel, a
particular edition of a dictionary. What sits on the shelf is a copy, and a
popular title may have several. The distinction matters because what the
library lends is always a copy, never a title. Two members can be reading
the same title at the same time, on two copies; they cannot both have the
same copy.

## 4. Loans

A loan records three things: which copy, which member, and when it is due.
A copy that is on loan cannot be lent again until it has been returned; the
desk checks this before it stamps anything. A member may have at most six
loans at once. The cap is not a punishment. A collection circulates only if
copies spend most of their time with members and little of it waiting on one
member's shelf.

## 5. Due dates and renewals

Every loan has a due date, three weeks from the day it was made. Before the
due date a member may renew the loan, which replaces the due date with a new
one three weeks on. A loan may be renewed at most twice, and it may not be
renewed at all while another member holds a request for that title. Without
that rule a popular book could circle between renewals and never reach the
queue.

## 6. Holds

When every copy of a title is out, a member may place a hold on it. Holds on
a title are served in the order they were placed. When a copy of that title
comes back, it does not go to the shelf: it is set aside for the member at
the front of the queue, who has a week to collect it. If they do not, the
hold lapses and the copy passes to the next in line, or to the shelf if
there is no one.

## 7. Overdue loans and fines

A loan that has passed its due date without being returned is overdue. From
that day a fine accrues, a small fixed amount per day, until the copy is
returned. The fine is owed by the member on the loan, and stays on their
account after the return. A member whose fines exceed the limit may not
borrow until they have paid; they may still return items and keep their
holds.

## 8. Reference copies

Some copies are marked reference. A reference copy is never lent: it stays
in the building so that it is always there to consult. A title may have
both reference and lending copies, and a hold on the title waits only for a
lending copy.

## 9. Lost items

A loan that is still out six weeks after its due date is declared lost.
Declaring a loan lost closes it: the fine stops accruing, and the member
owes the replacement cost of the copy instead. If the copy turns up later,
the replacement charge is cancelled and the fine stands.

## 10. Why the rules fit together

Most of the rules follow from two facts stated early: the library lends
copies, not titles, and a member is not their card. Because what is lent is
a copy, "is this available" and "may this person take it" are separate
questions, one about the copy and one about the member. Because the card is
not the membership, everything the library records attaches to the member
and survives a replaced card. The loan cap, the renewal limit, the hold
queue and the fines all serve the one aim from section 1: that items come
back, and come back in time for the next reader.
