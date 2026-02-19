; ZAX lowered .asm trace
; range: $0100..$014A (end exclusive)

; func read_counter begin
read_counter:
push AF                        ; 0100: F5
push BC                        ; 0101: C5
push DE                        ; 0102: D5
ld HL, (counter)               ; 0103: 2A 00 00
__zax_epilogue_0:
pop DE                         ; 0106: D1
pop BC                         ; 0107: C1
pop AF                         ; 0108: F1
ret                            ; 0109: C9
; func read_counter end
; func write_counter begin
write_counter:
push IX                        ; 010A: DD E5
ld IX, $0000                   ; 010C: DD 21 00 00
add IX, SP                     ; 0110: DD 39
push AF                        ; 0112: F5
push BC                        ; 0113: C5
push DE                        ; 0114: D5
push HL                        ; 0115: E5
push DE                        ; 0116: D5
push IX                        ; 0117: DD E5
pop HL                         ; 0119: E1
ld DE, $0004                   ; 011A: 11 04 00
add HL, DE                     ; 011D: 19
push HL                        ; 011E: E5
pop DE                         ; 011F: D1
ld a, (hl) ; inc hl ; ld h, (hl) ; ld l, a ; 0120: 7E 23 66 6F
push HL                        ; 0124: E5
ld HL, counter                 ; 0125: 21 00 00
pop DE                         ; 0128: D1
ld (hl), e ; inc hl ; ld (hl), d ; 0129: 73 23 72
__zax_epilogue_1:
pop HL                         ; 012C: E1
pop DE                         ; 012D: D1
pop BC                         ; 012E: C1
pop AF                         ; 012F: F1
ld SP, IX                      ; 0130: DD F9
pop IX                         ; 0132: DD E1
ret                            ; 0134: C9
; func main begin
; func write_counter end
main:
push AF                        ; 0135: F5
push BC                        ; 0136: C5
push DE                        ; 0137: D5
push HL                        ; 0138: E5
ld HL, $007B                   ; 0139: 21 7B 00
push HL                        ; 013C: E5
call write_counter             ; 013D: CD 00 00
inc SP                         ; 0140: 33
inc SP                         ; 0141: 33
ld HL, (counter)               ; 0142: 2A 00 00
__zax_epilogue_2:
pop HL                         ; 0145: E1
pop DE                         ; 0146: D1
pop BC                         ; 0147: C1
pop AF                         ; 0148: F1
ret                            ; 0149: C9
; func main end

; symbols:
; label read_counter = $0100
; label __zax_epilogue_0 = $0106
; label write_counter = $010A
; label __zax_epilogue_1 = $012C
; label main = $0135
; label __zax_epilogue_2 = $0145
; var counter = $014A
