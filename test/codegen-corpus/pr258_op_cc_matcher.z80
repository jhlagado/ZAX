; ZAX lowered ASM80 output

ORG $0100
; ZAX: func main begin
main:
push ix
ld ix, $00
add ix, sp
push af
push bc
push de
push hl
DB $CA, $00, $00
nop
__zax_if_else_1:
DB $C2, $00, $00
nop
__zax_if_else_3:
DB $D2, $00, $00
nop
__zax_if_else_5:
__zax_epilogue_0:
pop hl
pop de
pop bc
pop af
ld sp, ix
pop ix
ret
; ZAX: func main end
