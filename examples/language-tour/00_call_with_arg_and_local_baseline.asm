; ZAX lowered .asm trace
; range: $0100..$0161 (end exclusive)

; func inc_one begin
inc_one:
push BC                        ; 0100: C5
push BC                        ; 0101: C5
ld HL, $0004                   ; 0102: 21 04 00
add HL, SP                     ; 0105: 39
ld (HL), $0000                 ; 0106: 36 00
inc HL                         ; 0108: 23
ld (HL), $0000                 ; 0109: 36 00
ld HL, $0006                   ; 010B: 21 06 00
add HL, SP                     ; 010E: 39
ld (HL), $0064                 ; 010F: 36 64
inc HL                         ; 0111: 23
ld (HL), $0000                 ; 0112: 36 00
ld HL, $0006                   ; 0114: 21 06 00
add HL, SP                     ; 0117: 39
ld a, (hl) ; inc hl ; ld d, (hl) ; ld e, a ; 0118: 7E 23 56 5F
inc DE                         ; 011C: 13
ld HL, $0000                   ; 011D: 21 00 00
add HL, SP                     ; 0120: 39
ld (hl), e ; inc hl ; ld (hl), d ; 0121: 73 23 72
ld HL, $0000                   ; 0124: 21 00 00
add HL, SP                     ; 0127: 39
ld a, (hl) ; inc hl ; ld d, (hl) ; ld e, a ; 0128: 7E 23 56 5F
ex DE, HL                      ; 012C: EB
jp __zax_epilogue_0            ; 012D: C3 00 00
__zax_epilogue_0:
pop BC                         ; 0130: C1
pop BC                         ; 0131: C1
ret                            ; 0132: C9
; func inc_one end
; func main begin
main:
push BC                        ; 0133: C5
ld HL, $0002                   ; 0134: 21 02 00
add HL, SP                     ; 0137: 39
ld (HL), $0000                 ; 0138: 36 00
inc HL                         ; 013A: 23
ld (HL), $0000                 ; 013B: 36 00
push AF                        ; 013D: F5
push BC                        ; 013E: C5
push DE                        ; 013F: D5
push IX                        ; 0140: DD E5
push IY                        ; 0142: FD E5
ld HL, $0005                   ; 0144: 21 05 00
push HL                        ; 0147: E5
call inc_one                   ; 0148: CD 00 00
pop BC                         ; 014B: C1
pop IY                         ; 014C: FD E1
pop IX                         ; 014E: DD E1
pop DE                         ; 0150: D1
pop BC                         ; 0151: C1
pop AF                         ; 0152: F1
push HL                        ; 0153: E5
ld HL, $0002                   ; 0154: 21 02 00
add HL, SP                     ; 0157: 39
pop DE                         ; 0158: D1
ld (hl), e ; inc hl ; ld (hl), d ; 0159: 73 23 72
jp __zax_epilogue_1            ; 015C: C3 00 00
__zax_epilogue_1:
pop BC                         ; 015F: C1
ret                            ; 0160: C9
; func main end

; symbols:
; label inc_one = $0100
; label __zax_epilogue_0 = $0130
; label main = $0133
; label __zax_epilogue_1 = $015F

