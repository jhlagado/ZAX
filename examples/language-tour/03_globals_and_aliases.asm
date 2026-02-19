; ZAX lowered .asm trace
; range: $0100..$0162 (end exclusive)

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
push HL                        ; 0112: E5
push DE                        ; 0113: D5
push BC                        ; 0114: C5
push AF                        ; 0115: F5
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
pop DE                         ; 012C: D1
pop BC                         ; 012D: C1
pop AF                         ; 012E: F1
ld e, (ix-$0002)               ; 012F: DD 5E FE
ld d, (ix-$0001)               ; 0132: DD 56 FF
ex de, hl                      ; 0135: EB
ld SP, IX                      ; 0136: DD F9
pop IX                         ; 0138: DD E1
ret                            ; 013A: C9
; func main begin
; func write_counter end
main:
push IX                        ; 013B: DD E5
ld IX, $0000                   ; 013D: DD 21 00 00
add IX, SP                     ; 0141: DD 39
push HL                        ; 0143: E5
push DE                        ; 0144: D5
push BC                        ; 0145: C5
push AF                        ; 0146: F5
ld HL, $007B                   ; 0147: 21 7B 00
push HL                        ; 014A: E5
call write_counter             ; 014B: CD 00 00
inc SP                         ; 014E: 33
inc SP                         ; 014F: 33
ld HL, (counter)               ; 0150: 2A 00 00
__zax_epilogue_2:
pop DE                         ; 0153: D1
pop BC                         ; 0154: C1
pop AF                         ; 0155: F1
ld e, (ix-$0002)               ; 0156: DD 5E FE
ld d, (ix-$0001)               ; 0159: DD 56 FF
ex de, hl                      ; 015C: EB
ld SP, IX                      ; 015D: DD F9
pop IX                         ; 015F: DD E1
ret                            ; 0161: C9
; func main end

; symbols:
; label read_counter = $0100
; label __zax_epilogue_0 = $0106
; label write_counter = $010A
; label __zax_epilogue_1 = $012C
; label main = $013B
; label __zax_epilogue_2 = $0153
; var counter = $0162
