; ZAX lowered ASM80 output

ORG $0100
; ZAX: func main begin
main:
push ix
ld ix, $00
add ix, sp
push hl
ld hl, $00
ex (SP), hl
push af
push bc
push de
push hl
DB $CA, $00, $00
__zax_epilogue_0:
pop hl
pop de
pop bc
pop af
ld sp, ix
pop ix
ret
; ZAX: func main end
