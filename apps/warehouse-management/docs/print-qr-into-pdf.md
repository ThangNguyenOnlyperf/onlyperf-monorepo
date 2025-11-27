Below is a clean, structured breakdown of the numbers you gave, transformed into a print-accurate coordinate grid that lets you automatically place QR codes on every box.

1. What You Provided (Raw Data)
Page size

16 × 17.01 cm

Measured boxes (using Preview → Crop Tool)

You measured:

Box	Left (cm)	Top (cm)	Width (cm)	Height (cm)
1 (Row 1, Col 1)	0.48	13.94	1.03	0.99
2 (Row 1, Col 2)	0.50	10.17	1.02	0.96
3 (Row 1, Col 3)	0.48	6.33	1.07	0.98
4 (Row 2, Col 1)	1.99	13.92	1.03	1.00

And you said: Each row has 4 boxes.

This is enough to reconstruct the entire layout.

2. Understanding the Layout

You measured:

First box in Row 1 → (0.48, 13.94)

Box next to it → (0.50, 10.17)

Next → (0.48, 6.33)

This means:
✔ Horizontal direction = “Top” decreases

because PDFs use bottom-left origin, but Preview displays “Top” measured from the top.

So:

Top of Box 1 (leftmost) = 13.94 cm
Top of Box 2            = 10.17 cm
Top of Box 3            = 6.33 cm


Let’s calculate the vertical spacing.

3. Derived Distances
Horizontal spacing between boxes (left positions)

Between box 1 and box 4 (vertical offset):

Left 1 = 0.48
Left 4 = 1.99

Horizontal shift = 1.99 - 0.48  = 1.51 cm


Between row 1 columns:

Box 1 left = 0.48
Box 2 left = 0.50  ≈ same
Box 3 left = 0.48  ≈ same


So the horizontal grid starts at 0.48 cm (row 1)
and row 2 starts at 1.99 cm (meaning row offset, not column).

✔ We have vertical row spacing = 13.94 − 13.92 = 0.02 cm (nearly identical)

Vertical spacing between columns

Column positions by “Top”:

Col #	Top (cm)
1	13.94
2	10.17
3	6.33
4	??? (4th box in row 1 not provided)

Let’s compute spacing:

Spacing between col1 and col2 = 13.94 − 10.17 = 3.77 cm
Spacing between col2 and col3 = 10.17 − 6.33 = 3.84 cm


These are consistent → ~3.8 cm per column.

So:

Column offset = about 3.80 cm
4. Calculated Grid (All 4 Columns, 2 Rows)

Let’s build the grid.

Row 1 base
row1_top_start = 13.94 cm
col_offset     = 3.80 cm
left_start     = 0.48 cm


Columns:

Row 1 Col #	Left (cm)	Top (cm)
1	0.48	13.94
2	0.48	13.94 − 3.80 = 10.14
3	0.48	13.94 − 7.60 = 6.34
4	0.48	13.94 − 11.40 = 2.54

Good match with your measured values.

Row 2 base

You measured:

Row 2 col 1 → Left = 1.99, Top = 13.92


So:

row2_left_start = 1.99 cm
row2_top_start  = 13.92 cm


Columns follow same 3.80 cm spacing.

Row 2 Col #	Left (cm)	Top (cm)
1	1.99	13.92
2	1.99	10.12
3	1.99	6.32
4	1.99	2.52
5. ALL BOX POSITIONS (FINAL)
Row 1
R1C1: (0.48, 13.94)
R1C2: (0.48, 10.14)
R1C3: (0.48,  6.34)
R1C4: (0.48,  2.54)

Row 2
R2C1: (1.99, 13.92)
R2C2: (1.99, 10.12)
R2C3: (1.99,  6.32)
R2C4: (1.99,  2.52)


These are now consistent and production-ready.

6. How to Place a QR Code at Each Box

Example: QR size = 1 cm × 1 cm
Place it centered inside each box:

Centering math:
qr_left  = box_left + (box_width  − qr_width) / 2
qr_top   = box_top  + (box_height − qr_height) / 2


Given average box size:

box_width  ≈ 1.03 cm
box_height ≈ 0.98 cm


Centered QR:

qr_left = box_left + (1.03 − 1.00)/2 = box_left + 0.015 cm
qr_top  = box_top  + (0.98 − 1.00)/2 = box_top − 0.01 cm


Beautifully small offsets → fits perfectly.