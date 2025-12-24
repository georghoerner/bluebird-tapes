there are some errors in the summary, probably because I didnt maintain the TODOs or because I remember things differently
let's go through it

1. ASCII Art Color Issues: right
2. right, add testing of mismatch fix
3. right

4. Define Army List Grammar: I am not quite sure, but with 5. is seems to be a grammar for the parser?
5. so far there is only autocomplete, huh
6. Multi Column Layout: I think what would be best is: Unit Info Column should have just engough width to display the unit info comfortably, and the army list should be able to be wider if needed. The ASCII art column should be collapsible/ scalable with - + buttons. Just the general feeling I have about it
7. Unit Info panel is already wired up to cursor position, it at least works like that so far
8. Autocomplete System could be a bit more context aware, yea. also, I think it is important to let users just type something and if the parser cannot make sense of it, mark it as <user input> and treat it as such

9. Here the important thing is more that the ASCII art can be rescaled when the layout needs it and not on user input. And I think pregenerating all the width in 10 char increments is no problem (add TODO for investiation of size considerations)
10. put this under terminal animations
11. right
12. addition: rules explanation pages

13. right
14. there is already a parser tool to parse text entry into json files, low prio do do it directly from PDF

15. right
16. right
17. leave out

18. right
19. right

20. right

21. right
22. add under 11.
23. good idea, keep it in

in addition: I would like to work on the parser grammar and test out the function



